import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  findBestMatch,
  normalizeDescriptors,
  type MatchCandidate,
  isValidDescriptor,
} from '@/lib/face-utils';
import { startOfDay, dayCodeOf } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { notifyAttendance } from '@/lib/notifications';
import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  descriptor: z.array(z.number()).length(128),
  lessonId: z.string().min(1, 'Dars tanlang'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    if (session.role !== 'ADMIN' && session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    // Har bir so'rov guruhning barcha deskriptorlarini o'qib, 128 o'lchovli
    // taqqoslash qiladi. Kalit IP emas, foydalanuvchi bo'yicha — maktabda
    // hamma o'qituvchi bitta tashqi IP ortida bo'lishi mumkin.
    const rl = rateLimit(
      `recognize:${session.sub}`,
      env.RECOGNIZE_RATE_LIMIT,
      env.RECOGNIZE_RATE_WINDOW_SEC,
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Juda koʻp skanerlash. ${rl.retryAfterSec} soniyadan soʻng davom etadi.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success || !isValidDescriptor(parsed.data.descriptor)) {
      return NextResponse.json({ error: 'Yaroqsiz' }, { status: 400 });
    }

    // Load lesson with period
    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: {
        subject: { select: { name: true } },
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
        period: true,
      },
    });
    if (!lesson || !lesson.isActive) {
      return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    }

    if (session.role === 'TEACHER' && lesson.teacherId !== session.sub) {
      return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
    }

    // Time check
    const now = new Date();
    if (lesson.dayOfWeek !== dayCodeOf(now)) {
      return NextResponse.json({ error: `Bu dars bugun emas` }, { status: 403 });
    }

    // Yo'qlama sessiyasi — kamera faqat ochiq sessiyada ishlaydi
    const today = startOfDay(now);
    const scanSession = await prisma.attendanceSession.findUnique({
      where: { lessonId_date: { lessonId: lesson.id, date: today } },
    });

    if (!scanSession) {
      return NextResponse.json({ error: 'Yoʻqlama ochilmagan' }, { status: 403 });
    }
    if (now >= scanSession.closesAt) {
      return NextResponse.json(
        { error: `Yoʻqlama yopilgan. Kamera ${lesson.attendanceWindowMinutes} daqiqa ochiq edi.` },
        { status: 403 },
      );
    }

    // Match candidates
    const students = await prisma.student.findMany({
      where: { isActive: true, groupId: lesson.groupId },
      select: {
        id: true, fullName: true, groupId: true,
        photoUrl: true, parentPhone: true, faceDescriptor: true,
      },
    });

    // normalizeDescriptors eski (bitta massiv) va yangi (bir nechta namuna)
    // yozuvlarni bir xil ko'rinishga keltiradi — bazani ko'chirish shart emas.
    const candidates: MatchCandidate[] = students
      .map((s: typeof students[number]) => ({
        studentId: s.id,
        fullName: s.fullName,
        groupId: s.groupId,
        descriptors: normalizeDescriptors(s.faceDescriptor as unknown),
      }))
      .filter((c: MatchCandidate) => c.descriptors.length > 0);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Bu guruh talabalarida yuz maʼlumotlari yoʻq' },
        { status: 404 },
      );
    }

    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.55');
    const match = findBestMatch(parsed.data.descriptor, candidates, threshold);
    if (!match) {
      return NextResponse.json({ matched: false, reason: 'Yuz tan olinmadi' });
    }

    const matchedStudent = students.find((s: typeof students[number]) => s.id === match.studentId)!;

    const existing = await prisma.attendance.findFirst({
      where: { studentId: match.studentId, date: today, lessonId: lesson.id },
    });
    if (existing && existing.status !== 'ABSENT') {
      return NextResponse.json({
        matched: true,
        alreadyMarked: true,
        student: {
          id: matchedStudent.id,
          fullName: matchedStudent.fullName,
          photoUrl: matchedStudent.photoUrl,
          group: lesson.group,
        },
        lesson: {
          id: lesson.id,
          subject: lesson.subject.name,
          time: `${lesson.period.startTime}–${lesson.period.endTime}`,
        },
        attendance: existing,
        confidence: match.confidence,
      });
    }

    // Window is open — always PRESENT (no LATE inside window)
    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: 'PRESENT',
            checkInAt: now,
            method: 'face',
            confidence: match.confidence,
            markedById: session.sub,
          },
        })
      : await prisma.attendance.create({
          data: {
            studentId: match.studentId,
            lessonId: lesson.id,
            status: 'PRESENT',
            date: today,
            checkInAt: now,
            method: 'face',
            confidence: match.confidence,
            markedById: session.sub,
          },
        });

    notifyAttendance({
      studentName: matchedStudent.fullName,
      groupName: `${lesson.group.name} — ${lesson.subject.name}`,
      status: 'PRESENT',
      time: now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      parentPhone: matchedStudent.parentPhone,
    }).catch(() => {});

    return NextResponse.json({
      matched: true,
      alreadyMarked: false,
      student: {
        id: matchedStudent.id,
        fullName: matchedStudent.fullName,
        photoUrl: matchedStudent.photoUrl,
        group: lesson.group,
      },
      lesson: {
        id: lesson.id,
        subject: lesson.subject.name,
        time: `${lesson.period.startTime}–${lesson.period.endTime}`,
      },
      attendance,
      confidence: match.confidence,
    });
  } catch (err) {
    console.error('POST /api/attendance/recognize:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
