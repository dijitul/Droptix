'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Error boundary for the organiser onboarding flow.
 *
 * Typical failure is "Connect isn't activated on the platform account"
 * which an organiser can't self-resolve — we surface the exact action
 * required + the Stripe Dashboard link, plus keep support reachable.
 */
export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[organiser/onboarding] error:', error);
  }, [error]);

  const msg = error.message ?? '';
  const isConnectNotActivated = /Connect isn\u2019t activated|signed up for Connect/i.test(msg);
  const stripeUrl = msg.match(/https?:\/\/[^\s]+/)?.[0] ?? 'https://dashboard.stripe.com/connect';

  return (
    <main id="main" className="container max-w-2xl py-10">
      <Badge variant="hazard" className="mb-4">Onboarding paused</Badge>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
        <div className="flex-1">
          <h1 className="text-display-md uppercase">Stripe onboarding couldn&rsquo;t start</h1>
          <p className="mt-3 text-on-surface-variant">{msg || 'An unexpected error occurred.'}</p>

          {isConnectNotActivated && (
            <div className="mt-6 border-2 border-outline-variant bg-surface-container-low p-4">
              <div className="label-tech mb-2 text-tertiary">What the admin needs to do</div>
              <ol className="list-inside list-decimal space-y-1 text-sm">
                <li>Open the Stripe Dashboard platform settings</li>
                <li>Click &ldquo;Get started with Connect&rdquo;</li>
                <li>Fill out the short platform profile (business type, country)</li>
                <li>Return here and retry — takes about 5 minutes</li>
              </ol>
              <Button asChild size="sm" className="mt-4">
                <a href={stripeUrl} target="_blank" rel="noreferrer">
                  Open Stripe Connect setup
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/organiser">Back to dashboard</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/support">Contact support</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 label-tech text-muted-foreground">Reference: {error.digest}</p>
      )}
    </main>
  );
}
