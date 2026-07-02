import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
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
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const subject = await prisma.subject.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ subject });
  } catch (err) {
    console.error('PUT /api/subjects/[id]:', err);
    return NextResponse.json({ error: 'Yangilashda xato' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }
    await prisma.subject.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/subjects/[id]:', err);
    return NextResponse.json({ error: 'Oʻchirishda xato' }, { status: 500 });
  }
}
