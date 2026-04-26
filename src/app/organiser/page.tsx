import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Money } from '@/lib/money';
import { formatEventDate } from '@/lib/format';
import type { Currency } from '@prisma/client';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function OrganiserDashboard() {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

  // Resolve membership with findFirst (NOT findFirstOrThrow) — admins
  // are allowed in /organiser/* without a membership for cross-tenant
  // edit/attendees deep-links from /admin/events. The dashboard itself
  // doesn't make sense without an org context, so admin-without-org
  // gets bounced to /admin where they actually belong.
  const membership = await db.organiserMember.findFirst({
    where: { userId: user.id },
    include: { organiser: true },
  });
  if (!membership) {
    if (isAdmin) redirect('/admin');
    redirect('/sell/start');
  }
  const orgId = membership.organiserId;
  const org = membership.organiser;

  // KPI window — last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentOrders, upcomingEvents, totals] = await Promise.all([
    db.order.findMany({
      where: {
        status: 'PAID',
        event: { organiserId: orgId },
        paidAt: { gte: thirtyDaysAgo },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
      include: {
        event: { select: { title: true, slug: true } },
      },
    }),
    db.event.findMany({
      where: { organiserId: orgId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 6,
      include: {
        venue: { select: { name: true, city: true } },
        ticketTypes: { select: { capacity: true, soldCount: true } },
        _count: { select: { orders: { where: { status: 'PAID' } } } },
      },
    }),
    db.order.aggregate({
      where: {
        status: 'PAID',
        event: { organiserId: orgId },
        paidAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalAmount: true, subtotalAmount: true, platformFeeAmount: true },
      _count: true,
    }),
  ]);

  const gmv = Money.fromMinor(totals._sum.subtotalAmount ?? 0n, 'GBP');
  const fees = Money.fromMinor(totals._sum.platformFeeAmount ?? 0n, 'GBP');
  const orderCount = totals._count;

  const needsOnboarding = !org.stripeChargesEnabled || !org.stripePayoutsEnabled;

  return (
    <div className="flex flex-col gap-6">
      {needsOnboarding && (
        <div className="border-2 border-secondary bg-secondary/10 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <div className="flex-1">
              <div className="font-display text-lg font-bold uppercase">Finish onboarding</div>
              <p className="mt-1 text-sm text-on-surface-variant">
                You can&rsquo;t publish events or accept payments until Stripe verifies your
                identity and activates your payout account.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/organiser/onboarding?org=${org.id}`}>
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {!needsOnboarding && (
        <div className="border-2 border-primary bg-primary/5 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div className="flex-1 font-medium">You&rsquo;re live — create your first event.</div>
            <Button asChild>
              <Link href="/organiser/events/new">
                New event <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <header>
        <div className="label-tech mb-2 text-tertiary">Dashboard · 30d</div>
        <h1 className="text-display-md uppercase">Your scene, by the numbers.</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="GMV" value={gmv.format()} sublabel="Face value sold" />
        <Stat label="Orders" value={String(orderCount)} sublabel="Paid orders" />
        <Stat label="Platform fee" value={fees.format()} sublabel="To Droptix" />
        <Stat
          label="Net to you"
          value={gmv.subtract(fees).format()}
          sublabel="Excl. Stripe card fees"
          highlight
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border-2 border-outline-variant bg-surface-container lg:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-5 py-3">
            <h2 className="font-display text-lg font-bold uppercase">Upcoming events</h2>
            <Link href="/organiser/events" className="label-tech text-tertiary hover:underline">
              View all →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p>No events yet.</p>
              <Button asChild className="mt-4">
                <Link href="/organiser/events/new">Create your first event</Link>
              </Button>
            </div>
          ) : (
            <ul>
              {upcomingEvents.map((e) => {
                const cap = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
                const sold = e.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
                const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-4 border-b border-outline-variant/70 p-4 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{e.title}</div>
                      <div className="label-tech text-muted-foreground mt-0.5">
                        {formatEventDate(e.startsAt)}
                        {e.venue ? ` · ${e.venue.name}, ${e.venue.city}` : ''}
                      </div>
                    </div>
                    <div className="hidden w-36 sm:block">
                      <SellThroughBar percent={pct} />
                      <div className="label-tech mt-1 text-muted-foreground">
                        {sold} / {cap} · {pct}%
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/organiser/events/${e.id}/edit`}>Manage</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="border-2 border-outline-variant bg-surface-container">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-5 py-3">
            <h2 className="font-display text-lg font-bold uppercase">Recent sales</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No sales yet.</div>
          ) : (
            <ul>
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 border-b border-outline-variant/70 px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.buyerName}</div>
                    <div className="label-tech text-muted-foreground truncate">
                      {o.event.title}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display font-bold text-primary">
                      {Money.fromMinor(o.totalAmount, o.currency as Currency).format()}
                    </div>
                    <div className="label-tech text-muted-foreground">
                      {o.paidAt ? formatEventDate(o.paidAt) : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'border-2 border-primary bg-surface-container p-4'
          : 'border-2 border-outline-variant bg-surface-container p-4'
      }
    >
      <div className="label-tech text-tertiary">{label}</div>
      <div
        className={
          highlight
            ? 'font-display text-3xl font-bold text-primary mt-1'
            : 'font-display text-3xl font-bold mt-1'
        }
      >
        {value}
      </div>
      {sublabel && <div className="label-tech text-muted-foreground mt-1">{sublabel}</div>}
    </div>
  );
}

function SellThroughBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full border border-outline-variant bg-surface-dim">
      <div
        className="h-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
