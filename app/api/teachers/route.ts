import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  username: z.string().min(3, 'Username kamida 3 belgidan iborat boʻlsin'),
  fullName: z.string().min(2, 'F.I.Sh kerak'),
  email: z.string().email('Yaroqsiz email').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
  role: z.enum(['ADMIN', 'TEACHER']).default('TEACHER'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const url = req.nextUrl;
    const roleFilter = url.searchParams.get('role');
    const where: any = {};
    if (roleFilter) where.role = roleFilter;

    // plainPassword — FAQAT admin uchun (parolni ko'rib berish funksiyasi)
    const isAdmin = session.role === 'ADMIN';
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        role: true, isActive: true, createdAt: true, plainPassword: isAdmin,
        _count: { select: { lessons: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (err) {
    console.error('GET /api/teachers:', err);
    return NextResponse.json({ error: 'Foydalanuvchilarni olishda xato' }, { status: 500 });
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
    const { password, email, ...rest } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { username: rest.username } });
    if (exists) {
      return NextResponse.json({ error: 'Bunday username mavjud' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        ...rest,
        email: email || null,
        passwordHash: await hashPassword(password),
        plainPassword: password,
      },
      select: { id: true, username: true, fullName: true, email: true, role: true, isActive: true },
    });

    audit({
      action: 'user.create',
      actorId: session.sub,
      actorName: session.fullName,
      targetId: user.id,
      details: { username: user.username, role: user.role },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error('POST /api/teachers:', err);
    return NextResponse.json({ error: 'Foydalanuvchi yaratishda xato' }, { status: 500 });
  }
}