import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Liveness + DB probe for CyberPanel / Cloudflare health checks. */
export async function GET() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      dbLatencyMs: Date.now() - start,
      version: process.env.npm_package_version ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
