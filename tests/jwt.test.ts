import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-32chars!!';
});

describe('jwt round-trip', () => {
  it('signs and verifies a token', async () => {
    const { signToken, verifyToken } = await import('@/lib/jwt');
    const token = await signToken({
      sub: 'user-1',
      username: 'admin',
      role: 'ADMIN',
      fullName: 'Admin',
    });
    expect(typeof token).toBe('string');

    const payload = await verifyToken(token);
    expect(payload?.sub).toBe('user-1');
    expect(payload?.role).toBe('ADMIN');
  });

  it('returns null for a tampered/invalid token', async () => {
    const { verifyToken } = await import('@/lib/jwt');
    expect(await verifyToken('not.a.valid.token')).toBeNull();
  });
});
