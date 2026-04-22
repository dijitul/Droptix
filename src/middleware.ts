import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware responsibilities:
 *
 * 1. **Deduplicate proxy-appended headers.** Cloudflare adds host /
 *    x-forwarded-host on the way in, then our OpenLiteSpeed origin
 *    appends them again, so downstream code sees
 *    `'droptix.co.uk, droptix.co.uk'` and `new URL()` throws. We strip
 *    that here before Auth.js, Next's internal metadata, and any rate
 *    limiter reads the headers.
 *
 * 2. **Gate protected surfaces** (/account, /organiser, /admin,
 *    /scanner) behind a session cookie. Full role enforcement happens
 *    server-side inside the pages via guards.ts — middleware is only
 *    a cheap first-pass sieve so unauthenticated traffic never touches
 *    the DB on these surfaces.
 */

const PROTECTED = [/^\/account/, /^\/organiser/, /^\/admin/, /^\/scanner/];
const DEDUPE_HEADERS = ['host', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for'];

function dedupeHeaderValue(v: string): string {
  // Some proxies emit "host: a, a" — split, trim, take the first non-empty
  // unique value. Keeps behaviour deterministic whether or not the
  // upstream dedupes correctly.
  const parts = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const p of parts) {
    if (!seen.has(p)) return p;
    seen.add(p);
  }
  return parts[0] ?? '';
}

export async function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  let mutated = false;

  for (const key of DEDUPE_HEADERS) {
    const v = headers.get(key);
    if (v && v.includes(',')) {
      const clean = dedupeHeaderValue(v);
      if (clean && clean !== v) {
        headers.set(key, clean);
        mutated = true;
      }
    }
  }

  const { pathname } = req.nextUrl;

  if (PROTECTED.some((r) => r.test(pathname))) {
    const sessionCookie =
      req.cookies.get('authjs.session-token') ??
      req.cookies.get('__Secure-authjs.session-token');

    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (mutated) {
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  // Run middleware everywhere EXCEPT Next internals and static assets,
  // so the header dedupe is applied to /api/auth/* as well as pages.
  matcher: ['/((?!_next/|_vercel/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2|woff|txt|xml|json|map)$).*)'],
};
