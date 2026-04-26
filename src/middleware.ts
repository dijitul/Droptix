import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware:
 *
 * 1. **Dedupe proxy-appended headers.** Cloudflare + OpenLiteSpeed both
 *    set `host` / `x-forwarded-host` / `origin` / `referer`, so Node
 *    downstream sees `'droptix.co.uk, droptix.co.uk'` and `new URL()`
 *    chokes. We strip duplicates before Auth.js / Next / rate limits
 *    read them.
 *
 * 2. **Gate protected surfaces** (/account, /organiser, /admin,
 *    /scanner) behind a session cookie. Full role enforcement happens
 *    server-side via guards.ts — middleware is a cheap first pass.
 */

// Anchor at a path-segment boundary so /organiser doesn't accidentally
// gate /organisers (the public promoter directory). Same hazard for
// /account vs /accounts and /admin vs /admin-anything-else.
const PROTECTED = [
  /^\/account(\/|$)/,
  /^\/organiser(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/scanner(\/|$)/,
];
const DEDUPE_HEADERS = [
  'host',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-for',
  'x-forwarded-ssl',
  'origin',
  'referer',
  'x-real-ip',
];

function dedupeHeaderValue(v: string): string {
  const parts = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p);
      return p;
    }
  }
  return parts[0] ?? '';
}

/** Public site URL — never trust proxy-forwarded host for redirects. */
function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://droptix.co.uk';
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
      // Build the redirect from NEXT_PUBLIC_APP_URL, NOT from req.url —
      // req.url inside middleware is the INTERNAL URL (http://localhost:3001/...)
      // because Node is behind an OpenLiteSpeed proxy. Using it produces
      // browser-breaking "https://localhost:3001/login?from=/admin" redirects.
      const loginUrl = new URL('/login', getAppBaseUrl());
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
  matcher: [
    '/((?!_next/|_vercel/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2|woff|txt|xml|json|map|webmanifest)$).*)',
  ],
};
