/**
 * Auth utilities for API routes & server components.
 */
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { verifyToken, type TokenPayload } from './jwt';

export const AUTH_COOKIE = 'davomat_token';

// ── Password helpers ─────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Server-component / server-action session ─────────────────
/**
 * Reads the auth cookie (server side) and returns the decoded user.
 * Returns null if no/invalid token.
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Like `getCurrentUser` but also confirms the user still exists & is active.
 */
export async function getCurrentUserFresh() {
  const session = await getCurrentUser();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, fullName: true, role: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

// ── API-route guards ─────────────────────────────────────────
export async function requireAuth(req: NextRequest): Promise<TokenPayload | NextResponse> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
  }
  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Yaroqsiz token' }, { status: 401 });
  }
  return session;
}

export async function requireAdmin(req: NextRequest): Promise<TokenPayload | NextResponse> {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Faqat administrator kira oladi' }, { status: 403 });
  }
  return session;
}

/** Allow only specific roles. */
export async function requireRole(
  req: NextRequest,
  roles: Array<'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'>,
): Promise<TokenPayload | NextResponse> {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
  }
  return session;
}

export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
