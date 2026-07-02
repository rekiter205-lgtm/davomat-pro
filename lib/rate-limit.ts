/**
 * Lightweight in-memory rate limiter (fixed-window).
 *
 * Good enough for a single-instance deployment (the current target).
 * For a multi-instance / serverless deployment, swap the `Map` for Redis
 * behind the same `rateLimit()` signature.
 */

interface Counter {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, Counter>();

// Periodically drop expired counters so the map does not grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, c] of store) {
    if (c.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key      unique bucket key (e.g. `login:<ip>`)
 * @param limit    max allowed hits per window
 * @param windowSec window length in seconds
 */
export function rateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSec };
}

/** Clear a bucket early (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Best-effort client IP from a Next.js request. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') || 'unknown';
}
