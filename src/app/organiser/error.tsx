'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Error boundary covering every /organiser/* page. Catches any server
 * action throw that isn't handled inline, any render-time exception,
 * or any Prisma/Stripe hiccup — and surfaces the actual message
 * instead of Next's generic "Application error" screen.
 */
export default function OrganiserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[organiser] caught error:', error);
  }, [error]);

  const msg = humanMessage(error.message);

  return (
    <main id="main" className="container max-w-2xl py-12">
      <Badge variant="hazard" className="mb-4">
        Error{error.digest ? ` · #${error.digest.slice(0, 8)}` : ''}
      </Badge>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <h1 className="text-display-md uppercase">That didn&rsquo;t work</h1>
          <p className="mt-3 text-on-surface-variant">{msg}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/organiser">Dashboard</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/support">Contact support</Link>
        </Button>
      </div>
    </main>
  );
}

function humanMessage(raw: string): string {
  if (!raw || /server components|application error|digest/i.test(raw)) {
    return "Something broke on our end. Try again — if it keeps happening email support@droptix.co.uk.";
  }
  return raw;
}
