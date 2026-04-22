import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { env } from '@/lib/env';
import { randomBytes, createHmac } from 'node:crypto';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Droptix with a magic link — no passwords.',
};

export const dynamic = 'force-dynamic';

/**
 * The /login form POSTs directly to Auth.js's built-in sign-in endpoint
 * rather than going through a server action. Server actions in Next 15
 * were hitting a header-dedup bug when the request went through
 * Cloudflare → OpenLiteSpeed proxy layers (both were appending host/
 * origin headers). The standard sign-in route handler works fine.
 *
 * We mint the CSRF cookie + token ourselves so the form can be submitted
 * without an intermediate GET /api/auth/csrf round-trip.
 */
async function generateCsrfToken(): Promise<{ raw: string; cookieValue: string }> {
  const raw = randomBytes(32).toString('hex');
  const hash = createHmac('sha256', env.AUTH_SECRET).update(raw).digest('hex');
  return { raw, cookieValue: `${raw}|${hash}` };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const { raw: csrfToken, cookieValue } = await generateCsrfToken();

  const cookieStore = await cookies();
  const h = await headers();
  const host = h.get('x-forwarded-host')?.split(',')[0]?.trim() ?? h.get('host')?.split(',')[0]?.trim() ?? 'droptix.co.uk';
  const isSecure = host === 'droptix.co.uk' || h.get('x-forwarded-proto')?.split(',')[0]?.includes('https');

  cookieStore.set({
    name: isSecure ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
  });

  const callbackUrl = from ?? '/';

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-display-md uppercase">Sign in to Droptix</h1>
        <p className="mt-2 text-on-surface-variant">
          Pop your email in and we&rsquo;ll send you a magic link. No passwords ever.
        </p>
      </div>

      {error && (
        <div className="mb-4 border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'EmailSignin' && 'Couldn\u2019t send the email — please try again.'}
          {error === 'Verification' && 'Your link expired. Grab a fresh one.'}
          {error !== 'EmailSignin' && error !== 'Verification' && error}
        </div>
      )}

      <form
        action="/api/auth/signin/magic-link"
        method="POST"
        className="flex flex-col gap-4"
        noValidate
      >
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-xs text-muted-foreground">
            We&rsquo;ll email you a secure link that expires in 15 minutes.
          </p>
        </div>

        <Button type="submit" size="lg">
          Send magic link
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        By signing in you agree to our{' '}
        <Link href="/legal/terms" className="text-tertiary underline">Terms</Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="text-tertiary underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
