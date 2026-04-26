import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Browse music venues',
  description:
    'Every UK music venue on Droptix — pick a venue to see what’s on this month. Clubs, theatres, pubs, festivals.',
  alternates: { canonical: '/venues' },
};

export const dynamic = 'force-dynamic';

export default async function VenuesIndexPage() {
  // Public venues with at least one upcoming on-sale event count first;
  // venues with no upcoming events still render so the hub is crawlable.
  const venues = await db.venue.findMany({
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          events: {
            where: {
              status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] },
              publishedAt: { not: null },
              startsAt: { gte: new Date() },
            },
          },
        },
      },
    },
  });

  // Push live-event venues to the top — same as /cities and /genres do.
  const sorted = [...venues].sort((a, b) => {
    if (b._count.events !== a._count.events) return b._count.events - a._count.events;
    return a.name.localeCompare(b.name);
  });

  return (
    <main id="main" className="container py-12 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <Badge variant="tech" className="mb-4">Venues · UK</Badge>
        <h1 className="text-display-lg uppercase">Browse by venue</h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Every UK music venue on Droptix. Pick a venue to see every upcoming
          show, from sold-out club nights to long-run residencies.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">
            No venues listed yet.{' '}
            <Link href="/sell" className="text-primary underline">List your venue</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((v) => (
            <Link
              key={v.slug}
              href={`/venues/${v.slug}`}
              className="group flex items-start justify-between gap-3 border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
                  <span className="label-tech truncate text-tertiary">{v.city}</span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-tight group-hover:text-primary">
                  {v.name}
                </h2>
                {v.capacity && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capacity {v.capacity.toLocaleString('en-GB')}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-2xl font-bold text-primary">
                  {v._count.events}
                </div>
                <div className="label-tech text-muted-foreground">
                  {v._count.events === 1 ? 'event' : 'events'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
