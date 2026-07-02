import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { dayCodeOf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  subjectId: z.string().min(1),
  groupId: z.string().min(1),
  teacherId: z.string().min(1),
  dayOfWeek: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  periodId: z.string().min(1),
  attendanceWindowMinutes: z.number().int().min(1).max(60).default(5),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const url = req.nextUrl;
    const day = url.searchParams.get('day');
    const today = url.searchParams.get('today') === '1';
    const groupId = url.searchParams.get('groupId') || undefined;

    const where: any = { isActive: true };
    if (day) where.dayOfWeek = day;
    if (today) where.dayOfWeek = dayCodeOf(new Date());
    if (groupId) where.groupId = groupId;

    // Role-based
    if (session.role === 'TEACHER') {
      where.teacherId = session.sub;
    } else if (session.role === 'STUDENT') {
      const profile = await prisma.student.findUnique({
        where: { userId: session.sub },
        select: { groupId: true },
      });
      if (!profile?.groupId) return NextResponse.json({ lessons: [] });
      where.groupId = profile.groupId;
    } else if (session.role === 'PARENT') {
      const me = await prisma.user.findUnique({
        where: { id: session.sub },
        include: { children: { select: { groupId: true } } },
      });
      const groupIds = (me?.children || [])
        .map((c: { groupId: string | null }) => c.groupId)
        .filter((id: string | null): id is string => !!id);
      if (groupIds.length === 0) return NextResponse.json({ lessons: [] });
      where.groupId = { in: groupIds };
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
        period: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { number: 'asc' } }],
    });
    return NextResponse.json({ lessons });
  } catch (err) {
    console.error('GET /api/lessons:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 },
      );
    }

    const teacher = await prisma.user.findUnique({ where: { id: parsed.data.teacherId } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Yaroqsiz oʻqituvchi' }, { status: 400 });
    }

    const lesson = await prisma.lesson.create({
      data: parsed.data,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
        period: true,
      },
    });
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu guruhda, bu kunda va bu parada dars allaqachon bor' },
        { status: 409 },
      );
    }
    console.error('POST /api/lessons:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
