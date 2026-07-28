import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { startOfDay, toDateKey } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  studentId: z.string().min(1),
  lessonId: z.string().min(1),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT']),
  date: z.string().optional(), // YYYY-MM-DD
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const url = req.nextUrl;
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
    const groupId = url.searchParams.get('groupId') || undefined;
    const studentId = url.searchParams.get('studentId') || undefined;
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    const where: any = {};
    if (dateParam) {
      const d = startOfDay(new Date(dateParam));
      where.date = d;
    } else if (fromParam || toParam) {
      where.date = {};
      if (fromParam) where.date.gte = startOfDay(new Date(fromParam));
      if (toParam)   where.date.lte = startOfDay(new Date(toParam));
    }
    if (studentId) where.studentId = studentId;
    if (groupId)   where.student = { ...(where.student || {}), groupId };

    // ── Role-based scoping ─────────────────────────────────────
    if (session.role === 'STUDENT') {
      // Student can only see their own attendance
      const myProfile = await prisma.student.findUnique({
        where: { userId: session.sub },
        select: { id: true },
      });
      if (!myProfile) return NextResponse.json({ attendance: [] });
      where.studentId = myProfile.id;
    } else if (session.role === 'PARENT') {
      // Parent: only their children's attendance
      const me = await prisma.user.findUnique({
        where: { id: session.sub },
        include: { children: { select: { id: true } } },
      });
      const childIds = (me?.children || []).map((c: { id: string }) => c.id);
      if (childIds.length === 0) return NextResponse.json({ attendance: [] });
      where.studentId = where.studentId
        ? (childIds.includes(where.studentId) ? where.studentId : '__none__')
        : { in: childIds };
    } else if (session.role === 'TEACHER') {
      // Teacher: only groups from their lessons
      const myLessons = await prisma.lesson.findMany({
        where: { teacherId: session.sub },
        select: { groupId: true },
        distinct: ['groupId'],
      });
      const ids = myLessons.map((l: { groupId: string }) => l.groupId);
      if (ids.length === 0) return NextResponse.json({ attendance: [] });
      where.student = { ...(where.student || {}), groupId: { in: ids } };
    }
    // ADMIN — no extra restriction

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true, fullName: true, photoUrl: true,
            group: { select: { id: true, name: true } },
          },
        },
        markedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ date: 'desc' }, { checkInAt: 'desc' }],
      // Hisobotlar shu endpoint'dan 30 kunlik oraliqni oladi — past limit
      // statistikani jimgina kesib, noto'g'ri raqam ko'rsatadi.
      take: 5000,
    });

    return NextResponse.json({ attendance: records });
  } catch (err) {
    console.error('GET /api/attendance:', err);
    return NextResponse.json({ error: 'Davomatni olishda xato' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });
    if (session.role !== 'ADMIN' && session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const { studentId, lessonId, status, date, notes } = parsed.data;
    const dateOnly = startOfDay(date ? new Date(date) : new Date());

    // Dars va talaba mavjudligini hamda mosligini tekshirish —
    // usiz FK xatosi 500 bo'lib qaytadi, o'qituvchi esa istalgan darsni belgilay olardi.
    const [lesson, student] = await Promise.all([
      prisma.lesson.findUnique({ where: { id: lessonId }, select: { teacherId: true, groupId: true } }),
      prisma.student.findUnique({ where: { id: studentId }, select: { groupId: true } }),
    ]);
    if (!lesson) return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    if (!student) return NextResponse.json({ error: 'Talaba topilmadi' }, { status: 404 });
    if (session.role === 'TEACHER' && lesson.teacherId !== session.sub) {
      return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
    }
    if (student.groupId !== lesson.groupId) {
      return NextResponse.json({ error: 'Talaba bu dars guruhida emas' }, { status: 400 });
    }

    // Upsert by (studentId, date, lessonId)
    const record = await prisma.attendance.upsert({
      where: {
        studentId_date_lessonId: { studentId, date: dateOnly, lessonId },
      },
      create: {
        studentId,
        lessonId,
        status,
        date: dateOnly,
        method: 'manual',
        notes: notes || null,
        markedById: session.sub,
      },
      update: {
        status,
        notes: notes || null,
        markedById: session.sub,
        method: 'manual',
      },
      include: {
        student: { select: { id: true, fullName: true, group: { select: { name: true } } } },
      },
    });

    audit({
      action: 'attendance.manual_mark',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: studentId,
      details: { lessonId, status, date: toDateKey(dateOnly) },
    });

    return NextResponse.json({ attendance: record }, { status: 201 });
  } catch (err) {
    console.error('POST /api/attendance:', err);
    return NextResponse.json({ error: 'Davomatni yozishda xato' }, { status: 500 });
  }
}
