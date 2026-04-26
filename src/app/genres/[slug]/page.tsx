import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { breadcrumbsJsonLd, jsonLdScript } from '@/lib/seo';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

async function loadGenre(slug: string) {
  const cat = await db.category.findUnique({ where: { slug } });
  if (!cat) return null;

  const events = await db.event.findMany({
    where: {
      status: 'ON_SALE',
      startsAt: { gte: new Date() },
      publishedAt: { not: null },
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

  return { cat, events };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await db.category.findUnique({ where: { slug }, select: { name: true } });
  if (!cat) return {};
  return {
    title: `${cat.name} events in the UK`,
    description: `Every UK ${cat.name.toLowerCase()} event on Droptix — gigs, club nights and festivals, low-fee and organiser-owned.`,
    alternates: { canonical: `/genres/${slug}` },
  };
}

export default async function GenrePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const loaded = await loadGenre(slug);
  if (!loaded) notFound();
  const { cat, events } = loaded;

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Genres', url: `${env.NEXT_PUBLIC_APP_URL}/genres` },
    { name: cat.name, url: `${env.NEXT_PUBLIC_APP_URL}/genres/${slug}` },
  ]);

  const cityMap = new Map<string, number>();
  for (const e of events) {
    const c = e.venue?.city;
    if (!c) continue;
    cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
  }
  const cities = Array.from(cityMap.entries()).sort(([, a], [, b]) => b - a);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />

      <main id="main" className="container py-12 sm:py-16">
        <header className="mb-10 flex flex-col gap-4">
          <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
            <Link href="/genres" className="hover:text-primary">Genres</Link>
            <span className="mx-2 text-outline">/</span>
            <span className="text-tertiary">{cat.name}</span>
          </nav>

          <Badge variant="tech" className="w-fit">{cat.name}</Badge>
          <h1 className="text-display-xl uppercase">{cat.name}</h1>
          <p className="max-w-prose text-lg text-on-surface-variant">
            {events.length} upcoming {cat.name.toLowerCase()} {events.length === 1 ? 'event' : 'events'} across the UK.
          </p>

          {cities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {cities.map(([c, n]) => (
                <Link
                  key={c}
                  href={`/uk/${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${cat.slug}`}
                >
                  <Badge variant="outline" className="hover:border-primary hover:text-primary">
                    {c} · {n}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </header>

        <div className="tech-divider my-8" aria-hidden="true" />

        {events.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant p-10 text-center">
            <p className="text-muted-foreground">No {cat.name.toLowerCase()} events live yet.</p>
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
                heroUrl={e.heroImage ? `/api/images/${e.heroImage.id}` : null}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
