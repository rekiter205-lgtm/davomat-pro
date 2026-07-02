/**
 * JWT helpers — uses `jose` so it works in both Node.js
 * runtime and Next.js Edge middleware.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Edge-safe: this module is imported by middleware, so we read process.env
// directly instead of importing the (Node-only) env loader.
const RAW_SECRET = process.env.JWT_SECRET || '';
if (process.env.NODE_ENV === 'production' && RAW_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set to a strong value (≥32 chars) in production. ' +
      'Generate one with: openssl rand -base64 32',
  );
}

const SECRET = new TextEncoder().encode(
  RAW_SECRET || 'dev-only-insecure-secret-change-me-32chars',
);
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload extends JWTPayload {
  sub: string;      // user id
  username: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  fullName: string;
}

export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
