'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Error boundary for the event edit page. The single most common
 * failure here is image upload when Cloudflare R2 isn't yet configured
 * — we surface that message verbatim so the organiser understands
 * they can save the event without artwork and come back later.
 */
export default function EventEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[organiser/events/[id]/edit] error:', error);
  }, [error]);

  const msg = error.message ?? '';

  return (
    <div className="flex flex-col gap-6">
      <Badge variant="hazard" className="w-fit">Something broke</Badge>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <h1 className="text-display-md uppercase">Couldn&rsquo;t save that change</h1>
          <p className="mt-3 text-on-surface-variant max-w-prose">
            {msg || 'Unexpected error — please try again.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/organiser/events">Back to events</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="label-tech text-muted-foreground">Reference: {error.digest}</p>
      )}
    </div>
  );
}
