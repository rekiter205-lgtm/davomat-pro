import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1, 'Fan nomi kerak'),
  description: z.string().optional().nullable(),
  color: z.string().default('#3b82f6'),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const subjects = await prisma.subject.findMany({
      include: { _count: { select: { lessons: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ subjects });
  } catch (err) {
    console.error('GET /api/subjects:', err);
    return NextResponse.json({ error: 'Fanlarni olishda xato' }, { status: 500 });
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

    const exists = await prisma.subject.findUnique({ where: { name: parsed.data.name } });
    if (exists) {
      return NextResponse.json({ error: 'Bunday nomli fan mavjud' }, { status: 409 });
    }

    const subject = await prisma.subject.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description || null,
        color: parsed.data.color,
      },
    });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (err) {
    console.error('POST /api/subjects:', err);
    return NextResponse.json({ error: 'Fan yaratishda xato' }, { status: 500 });
  }
}
