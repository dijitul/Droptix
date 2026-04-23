import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { breadcrumbsJsonLd, jsonLdScript } from '@/lib/seo';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const organiser = await db.organiser.findUnique({ where: { slug } });
  if (!organiser) return {};
  return {
    title: `${organiser.name} — UK music promoter`,
    description: organiser.description ?? `Upcoming events from ${organiser.name} on Droptix.`,
    alternates: { canonical: `/organisers/${slug}` },
  };
}

export default async function OrganiserPublicPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const organiser = await db.organiser.findUnique({
    where: { slug },
    include: {
      events: {
        where: { status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] }, publishedAt: { not: null } },
        orderBy: { startsAt: 'asc' },
        include: {
          venue: { select: { name: true, city: true } },
          organiser: { select: { name: true } },
          ticketTypes: {
            where: { isHidden: false },
            orderBy: { priceFaceValue: 'asc' },
            select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
          },
        },
      },
    },
  });

  if (!organiser || organiser.status === 'CLOSED') notFound();

  const upcoming = organiser.events.filter((e) => e.startsAt >= new Date());
  const past = organiser.events.filter((e) => e.startsAt < new Date());

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Promoters', url: `${env.NEXT_PUBLIC_APP_URL}/organisers` },
    { name: organiser.name, url: `${env.NEXT_PUBLIC_APP_URL}/organisers/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />

      <main id="main" className="container max-w-5xl py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground mb-6">
          <Link href="/discover" className="hover:text-primary">Events</Link>
          <span className="mx-2 text-outline">/</span>
          <span className="text-tertiary">{organiser.name}</span>
        </nav>

        <header className="mb-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="tech">UK promoter</Badge>
            {organiser.verifiedAt && (
              <Badge variant="success">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Verified
              </Badge>
            )}
            {organiser.city && <Badge variant="outline">{organiser.city}</Badge>}
          </div>

          <h1 className="text-display-xl uppercase">{organiser.name}</h1>

          {organiser.description && (
            <p className="max-w-prose text-lg text-on-surface-variant">{organiser.description}</p>
          )}

          {organiser.websiteUrl && (
            <a
              href={organiser.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 label-tech text-tertiary hover:underline"
            >
              {organiser.websiteUrl.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </header>

        <div className="tech-divider mb-8" aria-hidden="true" />

        {upcoming.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight">
              Upcoming shows
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {upcoming.map((e) => {
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
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-muted-foreground">
              Past shows
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 opacity-70">
              {past.slice(0, 8).map((e) => {
                const cheapest = e.ticketTypes[0];
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
                  />
                );
              })}
            </div>
          </section>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
            No events live yet &mdash; check back soon.
          </div>
        )}
      </main>
    </>
  );
}
