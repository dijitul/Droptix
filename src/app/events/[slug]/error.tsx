'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Per-route error boundary for event detail pages.
 *
 * Catches any uncaught throw during render or from a failing server
 * action, surfaces the message (in dev) or a friendly fallback (in
 * prod), and gives the user a clear "try again" path. Without this,
 * Next.js shows a generic white-screen production error that teaches
 * the user nothing.
 */
export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry once configured; until then, log to browser
    // console so a developer inspecting the tab can see the cause.
    console.error('[events/[slug]] caught error:', error);
  }, [error]);

  const friendly = humanMessage(error.message);

  return (
    <main id="main" className="container max-w-xl py-16">
      <Badge variant="hazard" className="mb-4">
        Error · {error.digest ? `#${error.digest}` : 'unexpected'}
      </Badge>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <h1 className="text-display-md uppercase">Something broke.</h1>
          <p className="mt-3 text-on-surface-variant">{friendly}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/discover">Browse other events</Link>
        </Button>
      </div>
    </main>
  );
}

function humanMessage(raw: string): string {
  if (!raw || /server components/i.test(raw) || /digest/i.test(raw)) {
    return "We couldn't complete that action. If this happens again, ping us at support@droptix.co.uk.";
  }
  return raw;
}
