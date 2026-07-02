import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      students: { where: { isActive: true }, orderBy: { fullName: 'asc' } },
      lessons: {
        include: {
          subject: { select: { name: true, color: true } },
          teacher: { select: { fullName: true } },
          period: true,
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
  return NextResponse.json({ group });
}

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
    const group = await prisma.group.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ group });
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
    await prisma.group.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Oʻchirishda xato' }, { status: 500 });
  }
}
