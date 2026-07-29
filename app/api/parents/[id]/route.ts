import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  childrenIds: z.array(z.string()).optional(),
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
    const { password, email, childrenIds, ...rest } = parsed.data;

    const data: any = { ...rest };
    if (email !== undefined) data.email = email || null;
    if (password) {
      data.passwordHash = await hashPassword(password);
      data.plainPassword = password;
    }
    if (childrenIds) {
      data.children = { set: childrenIds.map((id) => ({ id })) };
    }

    const parent = await prisma.user.update({
      where: { id: params.id },
      data,
      include: {
        children: { select: { id: true, fullName: true } },
      },
    });
    return NextResponse.json({ parent });
  } catch (err) {
    console.error('PUT /api/parents/[id]:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/parents/[id]:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
