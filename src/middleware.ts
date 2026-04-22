import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware — enforces auth on /account, /organiser, /admin,
 * /scanner routes. Called on every matching request edge-side-ish
 * (runs in Node on CyberPanel, not edge).
 *
 * Role-gated routes are re-checked inside the page as well; middleware
 * is a first line of defence, not the only line.
 */

const PROTECTED = [/^\/account/, /^\/organiser/, /^\/admin/, /^\/scanner/];
const ORGANISER_ONLY = [/^\/organiser/];
const ADMIN_ONLY = [/^\/admin/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED.some((r) => r.test(pathname))) return NextResponse.next();

  // Auth.js session cookie check — we don't run full `auth()` in middleware
  // because it does a DB lookup; the protected pages will do proper checks.
  const sessionCookie =
    req.cookies.get('authjs.session-token') ?? req.cookies.get('__Secure-authjs.session-token');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Full role enforcement happens server-side on the page. Middleware's
  // job is just to keep unauthenticated traffic off sensitive surfaces.
  void ORGANISER_ONLY;
  void ADMIN_ONLY;
  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/organiser/:path*', '/admin/:path*', '/scanner/:path*'],
};
