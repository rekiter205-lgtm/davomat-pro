/**
 * GET /api/audit — audit jurnalini ko'rish (faqat ADMIN).
 * Filters: ?action=auth.login&take=100&cursor=<id>
 */
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const url = req.nextUrl;
    const action = url.searchParams.get('action') || undefined;
    const take = Math.min(parseInt(url.searchParams.get('take') || '100', 10) || 100, 500);
    const cursor = url.searchParams.get('cursor') || undefined;

    const logs = await prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return NextResponse.json({
      logs,
      nextCursor: logs.length === take ? logs[logs.length - 1].id : null,
    });
  } catch (err) {
    console.error('GET /api/audit:', err);
    return NextResponse.json({ error: 'Jurnalni olishda xato' }, { status: 500 });
  }
}
