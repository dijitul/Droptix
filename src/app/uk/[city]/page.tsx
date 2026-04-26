import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { breadcrumbsJsonLd, jsonLdScript } from '@/lib/seo';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Params = { city: string };

function unslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function loadCity(citySlug: string) {
  // Prefer canonical City row; fall back to derived city name from venues so
  // the page works for both seeded cities and ad-hoc venue cities.
  const cityRow = await db.city.findUnique({ where: { slug: citySlug } });
  const cityName = cityRow?.name ?? unslugify(citySlug);

  const events = await db.event.findMany({
    where: {
      status: 'ON_SALE',
      startsAt: { gte: new Date() },
      publishedAt: { not: null },
      venue: { city: { equals: cityName } },
    },
    orderBy: { startsAt: 'asc' },
    take: 60,
    include: {
      venue: { select: { name: true, city: true } },
      organiser: { select: { name: true } },
      categories: { include: { category: { select: { slug: true, name: true } } } },
      ticketTypes: {
        where: { isHidden: false },
        orderBy: { priceFaceValue: 'asc' },
        select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
      },
    },
  });

  // If the city is in our canonical list it's a "real" city — render the page
  // even with zero events. If it's not canonical AND has zero events, treat
  // as 404 (random slug).
  return { cityName, events, canonical: Boolean(cityRow) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city } = await params;
  const cityName = unslugify(city);
  return {
    title: `Music events in ${cityName}`,
    description: `Upcoming gigs, club nights and festivals in ${cityName}. UK music tickets on Droptix — lower fees, faster payouts.`,
    alternates: { canonical: `/uk/${city}` },
    openGraph: {
      title: `${cityName} music events`,
      description: `Every upcoming gig and club night in ${cityName} on Droptix.`,
      type: 'website',
    },
  };
}

export default async function CityHub({ params }: { params: Promise<Params> }) {
  const { city } = await params;
  const { cityName, events, canonical } = await loadCity(city);

  // Random slugs (not in City table, no venue match) → 404. Canonical
  // cities render even when empty so the URL works for early SEO + press.
  if (events.length === 0 && !canonical) {
    notFound();
  }

  // Collect genre slugs present for this city
  const genreMap = new Map<string, string>();
  for (const e of events) {
    for (const c of e.categories) {
      genreMap.set(c.category.slug, c.category.name);
    }
  }

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Cities', url: `${env.NEXT_PUBLIC_APP_URL}/cities` },
    { name: cityName, url: `${env.NEXT_PUBLIC_APP_URL}/uk/${city}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />

      <main id="main" className="container py-12 sm:py-16">
        <header className="mb-10 flex flex-col gap-4">
          <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
            <Link href="/cities" className="hover:text-primary">Cities</Link>
            <span className="mx-2 text-outline">/</span>
            <span className="text-tertiary">{cityName}</span>
          </nav>

          <Badge variant="tech" className="w-fit">UK · {cityName}</Badge>

          <h1 className="text-display-xl uppercase">
            Music events in<br />{cityName}
          </h1>
          <p className="max-w-prose text-lg text-on-surface-variant">
            {events.length === 0 ? (
              <>
                No live events in {cityName} yet &mdash; first drops landing soon. Run nights
                here?{' '}
                <Link href="/sell" className="text-primary underline">
                  Put your show on Droptix
                </Link>
                {' '}and own the city.
              </>
            ) : (
              <>
                {events.length} upcoming {events.length === 1 ? 'event' : 'events'} across{' '}
                {genreMap.size} {genreMap.size === 1 ? 'genre' : 'genres'}. Tickets for gigs, club nights,
                and festivals in {cityName} — direct from independent promoters.
              </>
            )}
          </p>

          {genreMap.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from(genreMap.entries()).map(([slug, name]) => (
                <Link key={slug} href={`/uk/${city}/${slug}`}>
                  <Badge variant="outline" className="hover:border-primary hover:text-primary">
                    {name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </header>

        <div className="tech-divider my-8" aria-hidden="true" />

        {events.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
            <p className="mb-4">Nothing on sale here right now.</p>
            <Button asChild variant="outline">
              <Link href="/cities">Browse other UK cities</Link>
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {events.map((e) => {
            const cheapest = e.ticketTypes[0];
            const allSoldOut =
              e.ticketTypes.length > 0 && e.ticketTypes.every((t) => t.soldCount >= t.capacity);
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

        {events.length > 0 && (
          <div className="mt-16 flex justify-center">
            <Button asChild variant="outline">
              <Link href="/cities">← Other UK cities</Link>
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
