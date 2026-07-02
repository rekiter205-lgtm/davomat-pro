/**
 * Centralised environment validation.
 *
 * Import this once at server startup (it is imported by `lib/prisma.ts`)
 * so misconfiguration fails fast with a clear message instead of a cryptic
 * runtime error deep in a request handler.
 */
import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // In production the secret MUST be strong; in dev we allow a fallback.
  JWT_SECRET: isProd
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().min(1).default('dev-only-insecure-secret-change-me-32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0).max(2).default(0.55),
  LATE_THRESHOLD_MINUTES: z.coerce.number().min(0).default(15),

  // Login brute-force protection
  LOGIN_RATE_LIMIT: z.coerce.number().positive().default(10),
  LOGIN_RATE_WINDOW_SEC: z.coerce.number().positive().default(60),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Fail fast — a misconfigured deployment should not boot silently.
    throw new Error(`❌ Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
