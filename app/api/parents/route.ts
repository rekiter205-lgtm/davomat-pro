/**
 * GET /api/parents — list all parents (with their children)
 * POST /api/parents — create a parent user with children links
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  username: z.string().min(3, 'Username kamida 3 belgi'),
  fullName: z.string().min(2, 'F.I.Sh kerak'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  childrenIds: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const parents = await prisma.user.findMany({
      where: { role: 'PARENT' },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        isActive: true, createdAt: true,
        // plainPassword — admin ota-onaga login/parolini qayta aytib bera olishi uchun
        // (bu route allaqachon faqat ADMIN'ga ochiq)
        plainPassword: true,
        children: {
          select: {
            id: true, fullName: true, photoUrl: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ parents });
  } catch (err) {
    console.error('GET /api/parents:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const { username, fullName, password, phone, email, childrenIds } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: 'Bunday username band' }, { status: 409 });
    }

    const parent = await prisma.user.create({
      data: {
        username,
        fullName: fullName.trim(),
        phone: phone || null,
        email: email || null,
        passwordHash: await hashPassword(password),
        plainPassword: password,
        role: 'PARENT',
        children: childrenIds.length
          ? { connect: childrenIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        children: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ parent }, { status: 201 });
  } catch (err) {
    console.error('POST /api/parents:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
