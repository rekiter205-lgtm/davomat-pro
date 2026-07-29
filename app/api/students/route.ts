import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { isValidDescriptor } from '@/lib/face-utils';
import { getCurrentUser } from '@/lib/auth';
import { visibleGroupIds, visibleStudentIds } from '@/lib/scope';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  fullName: z.string().min(2, 'Ism kamida 2 ta belgidan iborat boʻlishi kerak'),
  phone: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  photoUrl: z.string().min(1, 'Rasm yuklash shart'),
  faceDescriptor: z.array(z.number()).length(128).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const groupId = req.nextUrl.searchParams.get('groupId') || undefined;
    const search = req.nextUrl.searchParams.get('search') || undefined;

    // ── Role-based scoping ─────────────────────────────────────
    // STUDENT/PARENT — faqat o'zi / farzandlari. TEACHER — o'z guruhlari.
    const myStudentIds = await visibleStudentIds(session);
    if (myStudentIds && myStudentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    let groupFilter: any = groupId ? { groupId } : {};
    if (!myStudentIds && session.role === 'TEACHER') {
      const myGroupIds = (await visibleGroupIds(session)) || [];

      if (groupId) {
        // Filtering by a specific group: ensure it's one of theirs
        if (!myGroupIds.includes(groupId)) {
          return NextResponse.json({ students: [] });
        }
      } else {
        // No filter: restrict to own groups only
        groupFilter = { groupId: { in: myGroupIds } };
      }
    }

    const students = await prisma.student.findMany({
      where: {
        isActive: true,
        ...groupFilter,
        ...(myStudentIds ? { id: { in: myStudentIds } } : {}),
        ...(search ? { fullName: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    // Strip large faceDescriptor from list response — saves bandwidth.
    const slim = (students as any[]).map(({ faceDescriptor, ...rest }: any) => ({
      ...rest,
      hasFaceData: faceDescriptor !== null,
    }));

    return NextResponse.json({ students: slim });
  } catch (err) {
    console.error('GET /api/students:', err);
    return NextResponse.json({ error: 'Talabalarni olishda xato' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator talaba qoʻsha oladi' }, { status: 403 });
    }
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.faceDescriptor && !isValidDescriptor(data.faceDescriptor)) {
      return NextResponse.json({ error: 'Yuz maʼlumotlari yaroqsiz' }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone || null,
        parentPhone: data.parentPhone || null,
        photoUrl: data.photoUrl,
        groupId: data.groupId || null,
        faceDescriptor: data.faceDescriptor ?? undefined,
      },
      include: { group: { select: { id: true, name: true } } },
    });

    audit({
      action: 'student.create',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: student.id,
      details: { fullName: student.fullName },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    console.error('POST /api/students:', err);
    return NextResponse.json({ error: 'Talaba qoʻshishda xato' }, { status: 500 });
  }
}
