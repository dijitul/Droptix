import { NextResponse } from 'next/server';
import { signOut } from '@/server/auth';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sign-out endpoint for the header menu form + /account sign-out button.
 * Auth.js's signOut() clears the session row and cookie; we then
 * redirect to home.
 */
export async function POST(): Promise<Response> {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL('/', env.NEXT_PUBLIC_APP_URL));
}

// Allow GET too so a plain <a href="/api/auth/signout"> also works
// (for email templates, bookmarks, etc).
export async function GET(): Promise<Response> {
  return POST();
}
