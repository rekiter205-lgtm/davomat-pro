import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, toDateKey } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    // Bu endpoint butun maktab kesimidagi agregatlarni va bugungi yo'qlama
    // ro'yxatini (ism, rasm, sinf) qaytaradi — faqat xodimlar uchun.
    // O'quvchi/ota-ona o'z ma'lumotini /api/my-attendance dan oladi.
    if (session.role !== 'ADMIN' && session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const today = startOfDay(new Date());

    // ── Build role-based filters ───────────────────────────────
    let studentWhere: any = {};   // for student.count / student queries
    let attendanceWhere: any = {}; // for attendance.count / queries
    let allowedGroupIds: string[] | null = null;

    if (session.role === 'TEACHER') {
      // Get teacher's groups from their lessons
      const myLessons = await prisma.lesson.findMany({
        where: { teacherId: session.sub },
        select: { groupId: true },
        distinct: ['groupId'],
      });
      allowedGroupIds = myLessons.map((l: { groupId: string }) => l.groupId);

      // Restrict everything to teacher's groups
      studentWhere = { groupId: { in: allowedGroupIds } };
      attendanceWhere = { student: { groupId: { in: allowedGroupIds } } };
    }
    // ADMIN — no restriction

    // Ko'rsatiladigan kun: odatda bugun. Bugunga yozuv bo'lmasa (ta'til,
    // dam olish kuni, o'quv yili tugagan) oxirgi ma'lumotli kunga tushamiz,
    // aks holda bosh sahifa butunlay bo'sh ko'rinadi.
    const latest = await prisma.attendance.findFirst({
      where: { ...attendanceWhere, date: { lte: today } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const refDate = latest ? startOfDay(latest.date) : today;
    const isToday = refDate.getTime() === today.getTime();

    const [
      studentsCount, activeStudents, groupsCount, teachersCount,
      todayRows, weekRows,
    ] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.student.count({ where: { ...studentWhere, isActive: true } }),
      // Groups: teacher sees only their own
      session.role === 'TEACHER'
        ? Promise.resolve(allowedGroupIds!.length)
        : prisma.group.count(),
      // Teachers count: only ADMIN sees this; for TEACHER show 1 (themselves)
      session.role === 'TEACHER'
        ? Promise.resolve(1)
        : prisma.user.count({ where: { role: 'TEACHER' } }),
      // Bugungi barcha yozuvlar — talaba bo'yicha guruhlash uchun
      prisma.attendance.findMany({
        where: { ...attendanceWhere, date: refDate },
        select: {
          studentId: true, status: true, checkInAt: true, confidence: true,
          student: { select: { fullName: true, photoUrl: true, group: { select: { name: true } } } },
        },
      }),
      // So'nggi 7 kun — kunlik trend uchun
      prisma.attendance.findMany({
        where: {
          ...attendanceWhere,
          date: {
            gte: new Date(refDate.getTime() - 6 * 24 * 60 * 60 * 1000),
            lte: refDate,
          },
        },
        select: { studentId: true, date: true, status: true },
      }),
    ]);

    // ── Kunlik status: talaba bo'yicha, dars bo'yicha emas ─────
    // Davomat har DARS uchun yoziladi (kuniga 6 tagacha), shuning uchun
    // yozuvlarni sanash "46 talaba / 63 keldi" kabi mantiqsizlik beradi.
    // Har talabaga kun uchun BITTA status beramiz:
    //   kech qolgan bo'lsa   → LATE   (kech qolish yashirilmaydi)
    //   aks holda kelgan     → PRESENT
    //   aks holda            → ABSENT
    // Natijada uch raqam bir-birini istisno qiladi va yig'indisi
    // talabalar sonidan oshmaydi.
    type Day = 'PRESENT' | 'LATE' | 'ABSENT';
    const dayStatusOf = (statuses: Iterable<string>): Day => {
      let present = false;
      for (const s of statuses) {
        if (s === 'LATE') return 'LATE';
        if (s === 'PRESENT') present = true;
      }
      return present ? 'PRESENT' : 'ABSENT';
    };

    // Bugun — har talaba uchun bitta qator
    const perStudent = new Map<string, {
      statuses: string[]; checkInAt: Date | null; confidence: number | null;
      student: { fullName: string; photoUrl: string; group: { name: string } | null };
    }>();
    for (const r of todayRows) {
      const cur = perStudent.get(r.studentId);
      if (!cur) {
        perStudent.set(r.studentId, {
          statuses: [r.status], checkInAt: r.checkInAt,
          confidence: r.confidence, student: r.student,
        });
        continue;
      }
      cur.statuses.push(r.status);
      // Kun bo'yicha birinchi kelgan vaqtini saqlaymiz
      if (r.checkInAt && (!cur.checkInAt || r.checkInAt < cur.checkInAt)) {
        cur.checkInAt = r.checkInAt;
        cur.confidence = r.confidence;
      }
    }

    const todayAttendance = Array.from(perStudent.entries())
      .map(([studentId, v]) => ({
        id: studentId,
        status: dayStatusOf(v.statuses),
        checkInAt: v.checkInAt,
        confidence: v.confidence,
        student: v.student,
      }))
      // Eng oxirgi kelganlar tepada, kelmaganlar oxirida
      .sort((a, b) => {
        if (!a.checkInAt && !b.checkInAt) return 0;
        if (!a.checkInAt) return 1;
        if (!b.checkInAt) return -1;
        return b.checkInAt.getTime() - a.checkInAt.getTime();
      });

    const todayPresent = todayAttendance.filter((r) => r.status === 'PRESENT').length;
    const todayLate    = todayAttendance.filter((r) => r.status === 'LATE').length;
    const todayAbsent  = todayAttendance.filter((r) => r.status === 'ABSENT').length;

    // ── 7 kunlik trend — u ham talaba bo'yicha ─────────────────
    const dayMap = new Map<string, { date: string; present: number; late: number; absent: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const key = toDateKey(d);
      dayMap.set(key, { date: key, present: 0, late: 0, absent: 0 });
    }
    // (kun, talaba) → shu kundagi statuslar
    const weekMap = new Map<string, Map<string, string[]>>();
    for (const row of weekRows) {
      const key = toDateKey(new Date(row.date));
      if (!dayMap.has(key)) continue;
      let students = weekMap.get(key);
      if (!students) { students = new Map(); weekMap.set(key, students); }
      const list = students.get(row.studentId);
      if (list) list.push(row.status);
      else students.set(row.studentId, [row.status]);
    }
    for (const [key, students] of weekMap) {
      const entry = dayMap.get(key)!;
      for (const statuses of students.values()) {
        const s = dayStatusOf(statuses);
        if (s === 'PRESENT') entry.present++;
        else if (s === 'LATE') entry.late++;
        else entry.absent++;
      }
    }
    const chart = Array.from(dayMap.values());

    return NextResponse.json({
      stats: {
        students: studentsCount,
        activeStudents,
        groups: groupsCount,
        teachers: teachersCount,
        todayPresent,
        todayLate,
        todayAbsent,
        // Bugun davomati belgilangan talabalar soni
        todayTotal: todayAttendance.length,
      },
      todayAttendance,
      chart,
      // Raqamlar qaysi kunga tegishli — bugun bo'lmasligi mumkin
      referenceDate: toDateKey(refDate),
      isToday,
      role: session.role, // help frontend hide/show admin-only labels
    });
  } catch (err) {
    console.error('GET /api/dashboard/stats:', err);
    return NextResponse.json({ error: 'Statistikani olishda xato' }, { status: 500 });
  }
}
