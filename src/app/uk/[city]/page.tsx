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
  const cityName = unslugify(citySlug);
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

  return { cityName, events };
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
  const { cityName, events } = await loadCity(city);

  if (events.length === 0) {
    // If we truly have no events for the city slug, 404. We keep the city
    // hub indexed only when there's real inventory to avoid thin pages.
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
            {events.length} upcoming {events.length === 1 ? 'show' : 'shows'} across{' '}
            {genreMap.size} {genreMap.size === 1 ? 'genre' : 'genres'}. Tickets for gigs, club nights,
            and festivals in {cityName} — direct from independent promoters.
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

        <div className="mt-16 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/cities">← Other UK cities</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
