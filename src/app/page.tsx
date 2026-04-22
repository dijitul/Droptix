import Link from 'next/link';
import { ArrowRight, ShieldCheck, Clock, PoundSterling } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '@/components/event-card';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const upcoming = await db.event.findMany({
    where: { status: 'ON_SALE', startsAt: { gte: new Date() }, publishedAt: { not: null } },
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
    <main id="main">
      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-primary/20">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 70% 20%, rgb(60 77 0 / 0.6), transparent 60%), radial-gradient(ellipse 60% 40% at 20% 90%, rgb(83 25 0 / 0.4), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div className="container py-20 md:py-28">
          <Badge variant="tech" className="mb-6">
            Droptix · UK live music
          </Badge>
          <h1 className="text-display-xl uppercase max-w-[20ch]">
            Tickets for rooms<br />that actually sweat.
          </h1>
          <p className="mt-6 max-w-prose text-lg text-on-surface-variant">
            Independent UK gigs, club nights and festivals. Lower fees than Skiddle. Faster payouts
            than Eventbrite. Built by people who still go to shows.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/discover">
                Browse events <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sell">Put an event on sale</Link>
            </Button>
          </div>

          {/* Why-us strip */}
          <dl className="mt-14 grid grid-cols-1 gap-6 border-t-2 border-outline-variant pt-8 md:grid-cols-3">
            <FeatureStat
              icon={PoundSterling}
              label="Fees"
              value="5% + 50p"
              note="Beats Skiddle, DICE, Eventbrite. Configurable per promoter."
            />
            <FeatureStat
              icon={Clock}
              label="Payouts"
              value="T+7 days"
              note="T+48h for trusted promoters. Not 30 days like the incumbents."
            />
            <FeatureStat
              icon={ShieldCheck}
              label="Tickets"
              value="HMAC-signed"
              note="Tamper-proof QR + backup door code. Scans offline."
            />
          </dl>
        </div>
      </section>

      {/* ── COMING UP ─────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="container py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="label-tech mb-2 text-tertiary">Line-up · 001</div>
              <h2 id="upcoming-heading" className="text-display-lg uppercase">
                Coming up
              </h2>
            </div>
            <Link href="/discover" className="label-tech text-primary hover:underline">
              Browse all →
            </Link>
          </div>

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

      {/* ── PROMOTER CTA ──────────────────────────────────────────── */}
      <section className="border-t-2 border-primary/20 bg-surface-container-low">
        <div className="container grid items-center gap-8 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="label-tech mb-3 text-tertiary">For promoters</div>
            <h2 className="text-display-md uppercase">
              Keep more of the door.<br />Pay your acts Monday.
            </h2>
            <p className="mt-4 max-w-prose text-on-surface-variant">
              Droptix was built for independent UK promoters who are tired of paying 12% to a platform
              that doesn&rsquo;t know their scene. Self-serve. Stripe Connect. Real-time dashboard. Scan
              tickets at the door with a PWA on any staff phone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sell">Start selling</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sell/fees">See fees</Link>
              </Button>
            </div>
          </div>
          <div className="border-2 border-outline-variant bg-surface-container p-6 md:p-8">
            <div className="label-tech mb-4 text-primary">Droptix vs. the incumbents</div>
            <dl className="grid grid-cols-3 gap-0 border border-outline-variant">
              <ComparisonHead>Fee</ComparisonHead>
              <ComparisonHead>Payout</ComparisonHead>
              <ComparisonHead>Signal</ComparisonHead>

              <ComparisonCell>12% + VAT<br /><small>Skiddle</small></ComparisonCell>
              <ComparisonCell>30 days<br /><small>Eventbrite</small></ComparisonCell>
              <ComparisonCell>Queue pages<br /><small>Ticketmaster</small></ComparisonCell>

              <ComparisonCell highlight>5% + 50p<br /><small>Droptix</small></ComparisonCell>
              <ComparisonCell highlight>7 days<br /><small>Droptix</small></ComparisonCell>
              <ComparisonCell highlight>Instant buy<br /><small>Droptix</small></ComparisonCell>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureStat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-primary/60 text-primary">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <div>
        <dt className="label-tech text-tertiary">{label}</dt>
        <dd className="font-display text-xl font-bold">{value}</dd>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function ComparisonHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-tech border-b border-outline-variant bg-surface-container-high px-3 py-2 text-tertiary">
      {children}
    </div>
  );
}

function ComparisonCell({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'border-t border-outline-variant bg-primary/10 px-3 py-3 font-display text-sm font-bold text-primary [&>small]:label-tech [&>small]:font-normal [&>small]:text-primary/70'
          : 'border-t border-outline-variant px-3 py-3 font-display text-sm font-bold text-on-surface-variant [&>small]:label-tech [&>small]:font-normal [&>small]:text-muted-foreground'
      }
    >
      {children}
    </div>
  );
}
