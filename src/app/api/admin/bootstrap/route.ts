import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-click admin bootstrap landing.
 *
 * The `admin:bootstrap` CLI creates a Session row and prints a URL
 * pointing here:
 *
 *     /api/admin/bootstrap?t=<sessionToken>
 *
 * Clicking it Sets the standard Auth.js session cookie server-side
 * (no document.cookie limits, no `__Secure-` prefix gotchas) and
 * redirects to /admin. The token is consumed — a successful GET
 * invalidates the raw token as a URL, so the bootstrap URL can't be
 * re-shared.
 *
 * Safety model: anyone who can read server logs or the admin's
 * terminal can already read the token. Over HTTPS + deleting the
 * token post-use, the URL is safe to click once. Sessions still
 * expire after 30 days as normal.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=MissingToken`);
  }

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: { user: { select: { id: true, email: true, role: true } } },
  });

  if (!session) {
    return NextResponse.redirect(`${baseUrl}/login?error=BootstrapTokenUnknown`);
  }
  if (session.expires < new Date()) {
    await db.session.delete({ where: { sessionToken: token } });
    return NextResponse.redirect(`${baseUrl}/login?error=BootstrapExpired`);
  }

  const isHttps = baseUrl.startsWith('https://');
  const cookieName = isHttps ? '__Secure-authjs.session-token' : 'authjs.session-token';

  const redirectTarget = url.searchParams.get('to')
    ? new URL(url.searchParams.get('to')!, baseUrl).toString()
    : `${baseUrl}/admin`;

  const response = NextResponse.redirect(redirectTarget);

  // Standard Auth.js v5 database-strategy cookie
  response.cookies.set({
    name: cookieName,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    expires: session.expires,
  });

  return response;
}
