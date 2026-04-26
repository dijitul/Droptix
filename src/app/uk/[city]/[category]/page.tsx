import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { breadcrumbsJsonLd, jsonLdScript } from '@/lib/seo';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Params = { city: string; category: string };

function unslugify(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function loadPage({ city, category }: Params) {
  const cityName = unslugify(city);
  const cat = await db.category.findUnique({ where: { slug: category } });
  if (!cat) return null;

  const events = await db.event.findMany({
    where: {
      status: 'ON_SALE',
      startsAt: { gte: new Date() },
      publishedAt: { not: null },
      venue: { city: { equals: cityName } },
      categories: { some: { categoryId: cat.id } },
    },
    orderBy: { startsAt: 'asc' },
    take: 60,
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

  return { cityName, category: cat, events };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city, category } = await params;
  const cityName = unslugify(city);
  const cat = await db.category.findUnique({ where: { slug: category }, select: { name: true } });
  if (!cat) return {};
  return {
    title: `${cat.name} in ${cityName}`,
    description: `Upcoming ${cat.name.toLowerCase()} events in ${cityName}. UK music tickets on Droptix.`,
    alternates: { canonical: `/uk/${city}/${category}` },
  };
}

export default async function CityCategoryPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const loaded = await loadPage(p);
  if (!loaded || loaded.events.length === 0) notFound();
  const { cityName, category, events } = loaded;

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Cities', url: `${env.NEXT_PUBLIC_APP_URL}/cities` },
    { name: cityName, url: `${env.NEXT_PUBLIC_APP_URL}/uk/${p.city}` },
    { name: category.name, url: `${env.NEXT_PUBLIC_APP_URL}/uk/${p.city}/${p.category}` },
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
            <Link href={`/uk/${p.city}`} className="hover:text-primary">{cityName}</Link>
            <span className="mx-2 text-outline">/</span>
            <span className="text-tertiary">{category.name}</span>
          </nav>

          <Badge variant="tech" className="w-fit">{category.name}</Badge>
          <h1 className="text-display-lg uppercase">
            {category.name}<br />in {cityName}
          </h1>
          <p className="max-w-prose text-lg text-on-surface-variant">
            {events.length} upcoming {category.name.toLowerCase()} {events.length === 1 ? 'event' : 'events'} in {cityName}.
          </p>
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
                heroUrl={e.heroImage ? `/api/images/${e.heroImage.id}` : null}
              />
            );
          })}
        </div>
      </main>
    </>
  );
}
