import { NextResponse } from 'next/server';
import { verifyScan } from '@/server/scanning';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Thin HTTP wrapper so the scanner PWA service worker can POST scan
 * results over Background Sync without needing Next's server-action
 * mechanism (which tightly couples to a client component session).
 */

const bodySchema = z.object({
  eventId: z.string().min(1),
  payload: z.string().min(1).max(1024),
  deviceId: z.string().min(1).max(128),
  scannerCrewId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await verifyScan(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
