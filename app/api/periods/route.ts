import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  number: z.number().int().min(1).max(20),
  name: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Vaqt formati HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Vaqt formati HH:mm'),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const periods = await prisma.period.findMany({ orderBy: { number: 'asc' } });
    return NextResponse.json({ periods });
  } catch (err) {
    console.error('GET /api/periods:', err);
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

    if (parsed.data.endTime <= parsed.data.startTime) {
      return NextResponse.json({ error: 'Tugash vaqti boshlanishdan keyin boʻlsin' }, { status: 400 });
    }

    const period = await prisma.period.create({ data: parsed.data });
    return NextResponse.json({ period }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Bu para raqami allaqachon mavjud' }, { status: 409 });
    }
    console.error('POST /api/periods:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
