/**
 * POST /api/attendance/finalize
 * Body: { lessonId: string }
 *
 * Yo'qlama oynasi tugagandan keyin chaqiriladi:
 *  - Bu darsda hozircha yozuvi yo'q barcha talabalar uchun ABSENT yozadi
 *  - Idempotent — qayta chaqirsa, mavjudlarini o'zgartirmaydi
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay, dayCodeOf, periodStatus } from '@/lib/utils';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  lessonId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });
    if (session.role !== 'ADMIN' && session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Yaroqsiz' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: { period: true },
    });
    if (!lesson) return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });

    if (session.role === 'TEACHER' && lesson.teacherId !== session.sub) {
      return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
    }

    // Faqat bugungi dars uchun
    const now = new Date();
    if (lesson.dayOfWeek !== dayCodeOf(now)) {
      return NextResponse.json({ error: 'Bu dars bugun emas' }, { status: 403 });
    }

    // Window'dan keyingi vaqtda ishlashi kerak
    const status = periodStatus(
      now,
      lesson.period.startTime,
      lesson.period.endTime,
      lesson.attendanceWindowMinutes,
    );
    if (status.status === 'before' || status.status === 'open') {
      return NextResponse.json(
        { error: 'Yoʻqlama oynasi hali ochiq' },
        { status: 403 },
      );
    }

    const today = startOfDay(now);

    // Bugun bu darsda yozuvi bor talabalar
    const existing = await prisma.attendance.findMany({
      where: { lessonId: lesson.id, date: today },
      select: { studentId: true },
    });
    const markedIds = new Set(existing.map((a: { studentId: string }) => a.studentId));

    // Guruhdagi barcha talabalar
    const students = await prisma.student.findMany({
      where: { isActive: true, groupId: lesson.groupId },
      select: { id: true },
    });

    const toMark = students.filter((s: { id: string }) => !markedIds.has(s.id));

    if (toMark.length === 0) {
      return NextResponse.json({ added: 0, message: 'Hamma talabalar belgilangan' });
    }

    await prisma.attendance.createMany({
      data: toMark.map((s: { id: string }) => ({
        studentId: s.id,
        lessonId: lesson.id,
        status: 'ABSENT' as const,
        date: today,
        method: 'auto-absent',
        markedById: session.sub,
      })),
      skipDuplicates: true,
    });

    audit({
      action: 'attendance.finalize',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: lesson.id,
      details: { markedAbsent: toMark.length },
    });

    return NextResponse.json({ added: toMark.length });
  } catch (err) {
    console.error('POST /api/attendance/finalize:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
