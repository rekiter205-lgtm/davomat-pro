/**
 * POST /api/students/[id]/account
 * Creates (or resets) a User account linked to this student.
 * Body: { username: string, password: string }
 *
 * Only ADMIN can do this.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  username: z.string().min(3, 'Username kamida 3 belgi'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
});

interface Ctx { params: { id: string } }

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!student) {
      return NextResponse.json({ error: 'Talaba topilmadi' }, { status: 404 });
    }

    // If already has account → reset password (and optionally rename)
    if (student.user) {
      const updated = await prisma.user.update({
        where: { id: student.user.id },
        data: {
          username: parsed.data.username,
          passwordHash: await hashPassword(parsed.data.password),
          plainPassword: parsed.data.password,
        },
        select: { id: true, username: true, fullName: true, role: true },
      });
      audit({
        action: 'student.account_created',
        actorId: session.sub,
        actorName: session.fullName,
        targetId: params.id,
        details: { username: parsed.data.username, mode: 'reset' },
      });
      return NextResponse.json({ user: updated, action: 'reset' });
    }

    // Check username uniqueness
    const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (exists) {
      return NextResponse.json({ error: 'Bunday username band' }, { status: 409 });
    }

    // Create user + link
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        fullName: student.fullName,
        passwordHash: await hashPassword(parsed.data.password),
        plainPassword: parsed.data.password,
        role: 'STUDENT',
      },
      select: { id: true, username: true, fullName: true, role: true },
    });
    await prisma.student.update({
      where: { id: params.id },
      data: { userId: user.id },
    });

    audit({
      action: 'student.account_created',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: params.id,
      details: { username: parsed.data.username, mode: 'created' },
    });

    return NextResponse.json({ user, action: 'created' });
  } catch (err) {
    console.error('POST /api/students/[id]/account:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!student?.user) {
      return NextResponse.json({ error: 'Akkaunt topilmadi' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: student.user.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/students/[id]/account:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
