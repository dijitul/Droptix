import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Users, ExternalLink } from 'lucide-react';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { breadcrumbsJsonLd, jsonLdScript } from '@/lib/seo';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const venue = await db.venue.findUnique({ where: { slug } });
  if (!venue) return {};
  return {
    title: `${venue.name}, ${venue.city}`,
    description:
      venue.description ?? `Upcoming music events at ${venue.name}, ${venue.city} on Droptix.`,
    alternates: { canonical: `/venues/${slug}` },
  };
}

export default async function VenuePublicPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const venue = await db.venue.findUnique({
    where: { slug },
    include: {
      events: {
        where: {
          status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] },
          publishedAt: { not: null },
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: 'asc' },
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
      },
    },
  });

  if (!venue) notFound();

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Cities', url: `${env.NEXT_PUBLIC_APP_URL}/cities` },
    { name: venue.city, url: `${env.NEXT_PUBLIC_APP_URL}/uk/${venue.city.toLowerCase()}` },
    { name: venue.name, url: `${env.NEXT_PUBLIC_APP_URL}/venues/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />

      <main id="main" className="container max-w-5xl py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground mb-6">
          <Link href="/cities" className="hover:text-primary">Cities</Link>
          <span className="mx-2 text-outline">/</span>
          <Link
            href={`/uk/${venue.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className="hover:text-primary"
          >
            {venue.city}
          </Link>
          <span className="mx-2 text-outline">/</span>
          <span className="text-tertiary">{venue.name}</span>
        </nav>

        <header className="mb-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="tech">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {venue.city}
            </Badge>
            {venue.capacity && (
              <Badge variant="outline">
                <Users className="h-3 w-3" aria-hidden="true" />
                {venue.capacity} cap
              </Badge>
            )}
          </div>

          <h1 className="text-display-xl uppercase">{venue.name}</h1>
          <p className="label-tech text-muted-foreground">
            {venue.addressLine1}
            {venue.addressLine2 ? `, ${venue.addressLine2}` : ''}, {venue.city} {venue.postcode}
          </p>

          {venue.description && (
            <p className="max-w-prose text-lg text-on-surface-variant">{venue.description}</p>
          )}

          {venue.websiteUrl && (
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 label-tech text-tertiary hover:underline"
            >
              {venue.websiteUrl.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </header>

        <div className="tech-divider mb-8" aria-hidden="true" />

        <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight">
          What&rsquo;s on
        </h2>

        {venue.events.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
            No upcoming events at {venue.name}.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {venue.events.map((e) => {
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

        {venue.accessibilityNotes && (
          <section className="mt-12 border-2 border-outline-variant bg-surface-container p-5">
            <div className="label-tech mb-2 text-tertiary">Accessibility</div>
            <p className="text-on-surface-variant">{venue.accessibilityNotes}</p>
          </section>
        )}
      </main>
    </>
  );
}
