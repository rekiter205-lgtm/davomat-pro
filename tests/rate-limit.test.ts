import { describe, it, expect } from 'vitest';
import { rateLimit, resetRateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('reports remaining count', () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 5, 60).remaining).toBe(4);
    expect(rateLimit(key, 5, 60).remaining).toBe(3);
  });

  it('reset clears the bucket', () => {
    const key = `test:${Math.random()}`;
    rateLimit(key, 1, 60);
    expect(rateLimit(key, 1, 60).ok).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 1, 60).ok).toBe(true);
  });
});
