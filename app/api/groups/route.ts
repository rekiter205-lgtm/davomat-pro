import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1, 'Sinf nomi kerak'),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    // Teacher: only groups where they have lessons
    let where = {};
    if (session.role === 'TEACHER') {
      const myLessons = await prisma.lesson.findMany({
        where: { teacherId: session.sub },
        select: { groupId: true },
        distinct: ['groupId'],
      });
      const ids = myLessons.map((l: { groupId: string }) => l.groupId);
      where = { id: { in: ids } };
    }

    const groups = await prisma.group.findMany({
      where,
      include: { _count: { select: { students: true, lessons: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ groups });
  } catch (err) {
    console.error('GET /api/groups:', err);
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
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const exists = await prisma.group.findUnique({ where: { name: parsed.data.name } });
    if (exists) {
      return NextResponse.json({ error: 'Bunday nomli sinf mavjud' }, { status: 409 });
    }
    const group = await prisma.group.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description || null,
      },
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    console.error('POST /api/groups:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
