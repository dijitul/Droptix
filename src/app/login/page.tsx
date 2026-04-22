import Link from 'next/link';
import { signIn } from '@/server/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { magicLinkRateLimit } from '@/server/rate-limit';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Droptix with a magic link — no passwords.',
};

async function sendMagicLink(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await magicLinkRateLimit(`${email}:${ip}`);
  if (!rl.ok) {
    throw new Error("You've requested too many magic links. Try again in 15 minutes.");
  }

  await signIn('magic-link', { email, redirect: true, redirectTo: '/login/check-email' });
}

export default function LoginPage() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in to Droptix</h1>
        <p className="mt-2 text-muted-foreground">
          Pop your email in and we&rsquo;ll send you a magic link. No passwords ever.
        </p>
      </div>

      <form action={sendMagicLink} className="flex flex-col gap-4" noValidate>
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
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
