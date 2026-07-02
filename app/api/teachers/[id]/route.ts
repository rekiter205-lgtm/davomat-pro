import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'TEACHER']).optional(),
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
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const { password, email, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (email !== undefined) data.email = email || null;
    if (password) {
      data.passwordHash = await hashPassword(password);
      data.plainPassword = password;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, username: true, fullName: true, email: true, role: true, isActive: true },
    });

    audit({
      action: 'user.update',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: user.id,
      details: { fields: Object.keys(parsed.data), passwordChanged: Boolean(password) },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('PUT /api/teachers/[id]:', err);
    return NextResponse.json({ error: 'Yangilashda xato' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }
    if (params.id === session.sub) {
      return NextResponse.json({ error: 'Oʻzingizni oʻchira olmaysiz' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });

    audit({
      action: 'user.delete',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/teachers/[id]:', err);
    return NextResponse.json({ error: 'Oʻchirishda xato' }, { status: 500 });
  }
}
