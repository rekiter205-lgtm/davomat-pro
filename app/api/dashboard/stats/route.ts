import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

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

    const [
      studentsCount, activeStudents, groupsCount, teachersCount,
      todayPresent, todayLate, todayAttendance, last7,
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
      prisma.attendance.count({
        where: { ...attendanceWhere, date: today, status: 'PRESENT' },
      }),
      prisma.attendance.count({
        where: { ...attendanceWhere, date: today, status: 'LATE' },
      }),
      prisma.attendance.findMany({
        where: { ...attendanceWhere, date: today },
        include: {
          student: { select: { fullName: true, photoUrl: true, group: { select: { name: true } } } },
        },
        orderBy: { checkInAt: 'desc' },
        take: 10,
      }),
      // Last 7 days attendance trend
      prisma.attendance.groupBy({
        by: ['date', 'status'],
        where: {
          ...attendanceWhere,
          date: {
            gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
            lte: today,
          },
        },
        _count: { _all: true },
      }),
    ]);

    // Build chart data: array of { date, present, late }
    const dayMap = new Map<string, { date: string; present: number; late: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, { date: key, present: 0, late: 0 });
    }
    for (const row of last7) {
      const key = new Date(row.date).toISOString().split('T')[0];
      const entry = dayMap.get(key);
      if (!entry) continue;
      if (row.status === 'PRESENT') entry.present = row._count._all;
      if (row.status === 'LATE')    entry.late    = row._count._all;
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
        todayTotal: todayPresent + todayLate,
      },
      todayAttendance,
      chart,
      role: session.role, // help frontend hide/show admin-only labels
    });
  } catch (err) {
    console.error('GET /api/dashboard/stats:', err);
    return NextResponse.json({ error: 'Statistikani olishda xato' }, { status: 500 });
  }
}
