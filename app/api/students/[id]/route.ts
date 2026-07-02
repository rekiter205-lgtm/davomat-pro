import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { isValidDescriptor } from '@/lib/face-utils';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  photoUrl: z.string().optional(),
  faceDescriptor: z.array(z.number()).length(128).optional().nullable(),
  isActive: z.boolean().optional(),
});

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

  // STUDENT — faqat o'z profili; PARENT — faqat o'z farzandi; xodimlar — hammasi
  if (session.role === 'STUDENT') {
    const me = await prisma.student.findUnique({ where: { userId: session.sub }, select: { id: true } });
    if (!me || me.id !== params.id) {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }
  } else if (session.role === 'PARENT') {
    const child = await prisma.student.findFirst({
      where: { id: params.id, parents: { some: { id: session.sub } } },
      select: { id: true },
    });
    if (!child) return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      group: { select: { id: true, name: true } },
      attendance: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });
  if (!student) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
  // strip descriptor from response
  const { faceDescriptor, ...rest } = student;
  return NextResponse.json({ student: { ...rest, hasFaceData: faceDescriptor !== null } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator tahrirlay oladi' }, { status: 403 });
    }
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
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

    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName.trim() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.parentPhone !== undefined && { parentPhone: data.parentPhone }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.faceDescriptor !== undefined && { faceDescriptor: data.faceDescriptor ?? undefined }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { group: { select: { id: true, name: true } } },
    });

    audit({
      action: 'student.update',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: student.id,
      details: { fields: Object.keys(data) },
    });

    return NextResponse.json({ student });
  } catch (err) {
    console.error('PUT /api/students/[id]:', err);
    return NextResponse.json({ error: 'Yangilashda xato' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator oʻchira oladi' }, { status: 403 });
    }

    // Default: soft delete (isActive=false) — davomat tarixi saqlanadi.
    // ?hard=true — butunlay o'chirish (davomat yozuvlari ham cascade bilan ketadi).
    const hard = req.nextUrl.searchParams.get('hard') === 'true';
    if (hard) {
      await prisma.student.delete({ where: { id: params.id } });
    } else {
      await prisma.student.update({ where: { id: params.id }, data: { isActive: false } });
    }

    audit({
      action: 'student.delete',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: params.id,
      details: { hard },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/students/[id]:', err);
    return NextResponse.json({ error: 'Oʻchirishda xato' }, { status: 500 });
  }
}
