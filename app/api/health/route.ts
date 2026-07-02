import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Liveness + readiness probe.
 * Returns 200 when the process is up and the database is reachable,
 * 503 otherwise. Used by Docker/orchestrators and uptime monitors.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      db: 'up',
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check DB error:', err);
    return NextResponse.json(
      { status: 'degraded', db: 'down', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
