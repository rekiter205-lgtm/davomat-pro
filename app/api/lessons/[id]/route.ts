import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  subjectId: z.string().optional(),
  groupId: z.string().optional(),
  teacherId: z.string().optional(),
  dayOfWeek: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).optional(),
  periodId: z.string().optional(),
  attendanceWindowMinutes: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

interface Ctx { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
        period: true,
      },
    });
    return NextResponse.json({ lesson });
  } catch (err) {
    return NextResponse.json({ error: 'Yangilashda xato' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }
    await prisma.lesson.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Oʻchirishda xato' }, { status: 500 });
  }
}
