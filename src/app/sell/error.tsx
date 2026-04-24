'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[sell] caught error:', error);
  }, [error]);

  return (
    <main id="main" className="container max-w-xl py-16">
      <Badge variant="hazard" className="mb-4">Hit a snag</Badge>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <h1 className="text-display-md uppercase">That didn&rsquo;t work</h1>
          <p className="mt-3 text-on-surface-variant">{error.message || 'Unexpected error.'}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/sell">Back to promoter page</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/support">Contact support</Link>
        </Button>
      </div>
    </main>
  );
}
