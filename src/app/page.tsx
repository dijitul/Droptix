import Link from 'next/link';
import { Ticket } from 'lucide-react';

/**
 * Phase 0 landing — placeholder. Replaced in Phase 1 with the full
 * Discover feed (events grid, city picker, categories).
 */
export default function HomePage() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 px-6 py-16">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
        <Ticket className="h-4 w-4" aria-hidden="true" />
        <span>Droptix · Phase 0</span>
      </div>

      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
        The UK&rsquo;s grassroots ticket marketplace.
      </h1>

      <p className="max-w-prose text-lg text-muted-foreground">
        Lower fees than Skiddle. Faster payouts than Eventbrite. Built for the independent promoters
        the big platforms overlook &mdash; and the punters who trust them.
      </p>

      <p className="text-sm text-muted-foreground">
        Launching on <time dateTime="2026-09-01">Sep 2026</time>. Phase 0 scaffold live.
      </p>

      <nav className="flex gap-3" aria-label="Primary">
        <Link
          href="/discover"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse events
        </Link>
        <Link
          href="/sell"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Sell tickets
        </Link>
      </nav>
    </main>
  );
}
