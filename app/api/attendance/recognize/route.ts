import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { findBestMatch, type MatchCandidate, isValidDescriptor } from '@/lib/face-utils';
import { startOfDay, dayCodeOf, periodStatus } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { notifyAttendance } from '@/lib/notifications';

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

    const status = periodStatus(
      now,
      lesson.period.startTime,
      lesson.period.endTime,
      lesson.attendanceWindowMinutes,
    );

    if (status.status === 'before') {
      return NextResponse.json(
        { error: `Dars hali boshlanmagan (${lesson.period.startTime})` },
        { status: 403 },
      );
    }
    if (status.status === 'closed' || status.status === 'ended') {
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

    const candidates: MatchCandidate[] = students
      .filter((s: typeof students[number]) => isValidDescriptor(s.faceDescriptor as unknown))
      .map((s: typeof students[number]) => ({
        studentId: s.id,
        fullName: s.fullName,
        groupId: s.groupId,
        descriptor: s.faceDescriptor as unknown as number[],
      }));

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
    const today = startOfDay(now);

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
