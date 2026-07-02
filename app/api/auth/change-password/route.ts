/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 *
 * Har qanday login qilgan foydalanuvchi o'z parolini o'zgartira oladi.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
  newPassword: z.string().min(6, 'Yangi parol kamida 6 belgi boʻlsin'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Joriy parol notoʻgʻri' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        plainPassword: newPassword,
      },
    });

    audit({
      action: 'auth.password_changed',
      actorId: user.id,
      actorName: user.fullName,
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/auth/change-password:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
