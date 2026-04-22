import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/event-card';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const upcoming = await db.event.findMany({
    where: {
      status: 'ON_SALE',
      startsAt: { gte: new Date() },
      publishedAt: { not: null },
    },
    orderBy: { startsAt: 'asc' },
    take: 8,
    include: {
      venue: { select: { name: true, city: true } },
      organiser: { select: { name: true } },
      ticketTypes: {
        where: { isHidden: false },
        orderBy: { priceFaceValue: 'asc' },
        select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
      },
    },
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
      <section className="mb-12 flex flex-col gap-5 md:mb-16">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          UK gigs, club nights, <span className="text-primary">comedy</span> & more.
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Lower fees than Skiddle. Faster payouts than Eventbrite. Droptix is built with the
          independent promoters the big platforms overlook &mdash; and the punters who trust them.
        </p>
        <nav className="flex flex-wrap gap-3" aria-label="Primary">
          <Button asChild size="lg">
            <Link href="/discover">Browse events</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sell">Put your event on sale</Link>
          </Button>
        </nav>
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="upcoming-heading" className="text-2xl font-semibold tracking-tight">
              Coming up
            </h2>
            <Link href="/discover" className="text-sm font-medium text-primary underline">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((e) => {
              const cheapest = e.ticketTypes[0];
              const allSoldOut =
                e.ticketTypes.length > 0 &&
                e.ticketTypes.every((t) => t.soldCount >= t.capacity);
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
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
