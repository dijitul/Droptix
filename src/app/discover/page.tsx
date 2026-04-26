import Link from 'next/link';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'All events',
  description: 'Every upcoming UK gig, club night and festival on Droptix.',
  alternates: { canonical: '/discover' },
};

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const events = await db.event.findMany({
    where: {
      status: 'ON_SALE',
      startsAt: { gte: new Date() },
      publishedAt: { not: null },
    },
    orderBy: { startsAt: 'asc' },
    take: 48,
    include: {
      venue: { select: { name: true, city: true, slug: true } },
      organiser: { select: { name: true, slug: true } },
          heroImage: { select: { id: true } },
      ticketTypes: {
        where: { isHidden: false },
        orderBy: { priceFaceValue: 'asc' },
        select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
      },
    },
  });

  return (
    <main id="main" className="container py-12 sm:py-16">
      <header className="mb-10 flex flex-col gap-3">
        <Badge variant="tech" className="w-fit">Line-up · UK</Badge>
        <h1 className="text-display-lg uppercase">All events</h1>
        <p className="max-w-prose text-lg text-on-surface-variant">
          Every upcoming gig, club night and festival on Droptix — direct from the independent
          promoters building the UK scene.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">
            No events live yet. New events are being added every week &mdash;{' '}
            <Link className="text-primary underline" href="/cities">browse by city</Link>
            {' '}or{' '}
            <Link className="text-primary underline" href="/genres">by genre</Link>.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Run an event?{' '}
            <Link className="label-tech text-primary underline" href="/sell">
              Put one on sale
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {events.map((e) => {
            const cheapest = e.ticketTypes[0];
            const allSoldOut = e.ticketTypes.length > 0 && e.ticketTypes.every((t) => t.soldCount >= t.capacity);
            return (
              <EventCard
                key={e.id}
                slug={e.slug}
                title={e.title}
                subtitle={e.subtitle}
                startsAt={e.startsAt}
                venue={e.venue}
                organiser={e.organiser}
                fromPrice={cheapest ? { amount: cheapest.priceFaceValue, currency: cheapest.currency } : null}
                soldOut={allSoldOut}
                heroUrl={e.heroImage ? `/api/images/${e.heroImage.id}` : null}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
