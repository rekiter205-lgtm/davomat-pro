import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { verifyPassword, AUTH_COOKIE } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { env } from '@/lib/env';
import { rateLimit, resetRateLimit, clientIp } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().min(1, 'Foydalanuvchi nomini kiriting'),
  password: z.string().min(1, 'Parolni kiriting'),
});

// Same message for "no such user" and "wrong password" to avoid leaking
// which usernames exist (user-enumeration).
const INVALID_CREDS = 'Login yoki parol notoʻgʻri';

export async function POST(req: NextRequest) {
  try {
    // Brute-force protection: cap attempts per IP per window.
    const ip = clientIp(req);
    const rl = rateLimit(`login:${ip}`, env.LOGIN_RATE_LIMIT, env.LOGIN_RATE_WINDOW_SEC);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Juda koʻp urinish. ${rl.retryAfterSec} soniyadan soʻng qayta urinib koʻring.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Notoʻgʻri maʼlumot' },
        { status: 400 },
      );
    }
    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      audit({ action: 'auth.login_failed', ip, details: { username } });
      return NextResponse.json({ error: INVALID_CREDS }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      audit({ action: 'auth.login_failed', ip, details: { username } });
      return NextResponse.json({ error: INVALID_CREDS }, { status: 401 });
    }

    // Successful login — clear the attempt counter for this IP.
    resetRateLimit(`login:${ip}`);
    audit({ action: 'auth.login', actorId: user.id, actorName: user.fullName, ip });

    const token = await signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
