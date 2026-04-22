import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Discover events',
  description: 'Browse upcoming UK gigs, club nights, comedy and more on Droptix.',
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
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8 flex flex-col gap-3">
        <Badge variant="soft" className="w-fit">Discover</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What&rsquo;s on</h1>
        <p className="max-w-prose text-muted-foreground">
          Gigs, club nights, comedy and more — direct from the independent promoters building the
          UK&rsquo;s live-music scene.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            No events live yet. <a className="font-medium text-primary underline" href="/sell">Be the first to list one</a>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
