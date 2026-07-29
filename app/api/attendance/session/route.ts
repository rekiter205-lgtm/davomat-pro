/**
 * Yo'qlama sessiyasi — kamera oynasi.
 *
 * GET  /api/attendance/session?lessonId=...  → bugungi sessiya (yoki null)
 * POST /api/attendance/session { lessonId }  → sessiyani ochadi
 *
 * Kamera faqat sessiya ochiq (now < closesAt) bo'lganda ishlaydi.
 * Bir dars × bir kun uchun faqat bitta sessiya — vaqti tugagach qayta ochib
 * bo'lmaydi (DB darajasida unique [lessonId, date] bilan kafolatlangan).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay, dayCodeOf } from '@/lib/utils';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({ lessonId: z.string().min(1) });

/** "HH:mm" ni bugungi Date ga aylantiradi */
function at(now: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const lessonId = req.nextUrl.searchParams.get('lessonId');
    if (!lessonId) return NextResponse.json({ error: 'lessonId kerak' }, { status: 400 });

    const session = await prisma.attendanceSession.findUnique({
      where: { lessonId_date: { lessonId, date: startOfDay(new Date()) } },
    });
    return NextResponse.json({ session });
  } catch (err) {
    console.error('GET /api/attendance/session:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Yaroqsiz' }, { status: 400 });

    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: { period: true },
    });
    if (!lesson || !lesson.isActive) {
      return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    }
    if (user.role === 'TEACHER' && lesson.teacherId !== user.sub) {
      return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
    }

    const now = new Date();
    if (lesson.dayOfWeek !== dayCodeOf(now)) {
      return NextResponse.json({ error: 'Bu dars bugun emas' }, { status: 403 });
    }
    if (now < at(now, lesson.period.startTime)) {
      return NextResponse.json(
        { error: `Dars hali boshlanmagan (${lesson.period.startTime})` },
        { status: 403 },
      );
    }
    if (now > at(now, lesson.period.endTime)) {
      return NextResponse.json(
        { error: 'Dars tugagan — yoʻqlamani endi ochib boʻlmaydi' },
        { status: 403 },
      );
    }

    const date = startOfDay(now);
    const existing = await prisma.attendanceSession.findUnique({
      where: { lessonId_date: { lessonId: lesson.id, date } },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            now < existing.closesAt
              ? 'Yoʻqlama allaqachon ochiq'
              : 'Yoʻqlama bugun ochilib boʻlgan — qayta ochib boʻlmaydi',
          session: existing,
        },
        { status: 409 },
      );
    }

    const closesAt = new Date(now.getTime() + lesson.attendanceWindowMinutes * 60_000);

    let session;
    try {
      session = await prisma.attendanceSession.create({
        data: { lessonId: lesson.id, date, openedAt: now, closesAt, openedById: user.sub },
      });
    } catch (err: any) {
      // Ikki qurilmadan bir vaqtda bosilsa — mavjudini qaytaramiz
      if (err.code === 'P2002') {
        const race = await prisma.attendanceSession.findUnique({
          where: { lessonId_date: { lessonId: lesson.id, date } },
        });
        return NextResponse.json(
          { error: 'Yoʻqlama allaqachon ochilgan', session: race },
          { status: 409 },
        );
      }
      throw err;
    }

    audit({
      action: 'attendance.session_open',
      actorId: user.sub,
      actorName: user.fullName,
      targetId: lesson.id,
      details: { closesAt, windowMinutes: lesson.attendanceWindowMinutes },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('POST /api/attendance/session:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
