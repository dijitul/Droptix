'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Client-side magic-link request.
 *
 * Handles the CSRF dance itself rather than relying on Auth.js's
 * built-in helpers or server actions (both of which were tripping on
 * duplicated proxy headers through Cloudflare → OpenLiteSpeed):
 *
 *   1. GET /api/auth/csrf — Auth.js sets the csrf-token cookie and
 *      returns { csrfToken }
 *   2. POST /api/auth/signin/magic-link with the token as a form field
 *   3. Auth.js validates cookie+body token, invokes
 *      sendVerificationRequest → our sendMail (Postmark → sendmail →
 *      stdout fallback)
 *   4. Route to /login/check-email on 2xx/3xx
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim().toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }

    startTransition(async () => {
      try {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        if (!csrfRes.ok) throw new Error('Could not initialise sign-in.');
        const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
        if (!csrfToken) throw new Error('Missing CSRF token.');

        const body = new URLSearchParams({
          email,
          csrfToken,
          callbackUrl,
          json: 'true',
        });

        const signInRes = await fetch('/api/auth/signin/magic-link', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          redirect: 'manual',
        });

        // Auth.js responds with 302 on success; with `redirect: 'manual'`
        // fetch won't follow, so we check the opaque redirect status.
        if (signInRes.type === 'opaqueredirect' || signInRes.status === 302 || signInRes.ok) {
          setSubmitted(true);
          router.push('/login/check-email');
        } else {
          const text = await signInRes.text().catch(() => '');
          throw new Error(text || `Sign-in failed (${signInRes.status}).`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
          disabled={isPending || submitted}
        />
        <p id="email-help" className="text-xs text-muted-foreground">
          We&rsquo;ll email you a secure link that expires in 15 minutes.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={isPending || submitted}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending&hellip;
          </>
        ) : submitted ? (
          'Check your email'
        ) : (
          'Send magic link'
        )}
      </Button>
    </form>
  );
}
