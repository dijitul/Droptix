import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Phase 0 landing — placeholder. Replaced in Phase 1 with the full
 * Discover feed (events grid, city picker, categories).
 */
export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 px-6 py-16"
    >
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

      <nav className="flex gap-3" aria-label="Primary">
        <Button asChild size="lg">
          <Link href="/discover">Browse events</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/sell">Sell tickets</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>
    </main>
  );
}
