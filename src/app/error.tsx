'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Root error boundary — the last line of defence. Catches anything that
 * slips through page/layout/route-level boundaries. Replaces Next's
 * default "Application error" screen with branded, actionable copy.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[root] caught error:', error);
  }, [error]);

  return (
    <main id="main" className="container grid min-h-[60vh] max-w-xl place-items-center py-16">
      <div className="flex flex-col items-start gap-5 text-left">
        <Badge variant="hazard">ERR · UNEXPECTED</Badge>
        <AlertTriangle className="h-10 w-10 text-secondary" aria-hidden="true" />
        <h1 className="text-display-md uppercase">That didn&rsquo;t work</h1>
        <p className="text-on-surface-variant">
          Something broke on our end. Try again, or drop us a line at{' '}
          <a className="text-tertiary underline" href="mailto:support@droptix.co.uk">
            support@droptix.co.uk
          </a>{' '}
          if it keeps happening.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="label-tech text-muted-foreground">
            Reference: {error.digest.slice(0, 12)}
          </p>
        )}
      </div>
    </main>
  );
}
