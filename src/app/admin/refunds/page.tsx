import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'Refunds & disputes' };
export const dynamic = 'force-dynamic';

export default async function AdminRefundsPage() {
  await requireAdmin();

  const refunds = await db.refund.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: {
          reference: true,
          buyerName: true,
          buyerEmail: true,
          totalAmount: true,
          currency: true,
          event: { select: { title: true, slug: true } },
        },
      },
    },
  });

  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0n);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Support queue</div>
        <h1 className="text-display-md uppercase">Refunds &amp; disputes</h1>
        <p className="mt-3 max-w-prose text-on-surface-variant">
          Every refund issued through Stripe, with reason and triggering admin.
          Stripe disputes get a dedicated surface here as they come in.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Refunds issued" value={String(refunds.length)} />
        <StatCard
          label="Total refunded"
          value={Money.fromMinor(totalRefunded, 'GBP').format()}
          variant="hazard"
        />
      </div>

      {refunds.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
          No refunds yet.
        </div>
      ) : (
        <div className="border-2 border-outline-variant bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left">
                <Th>Order</Th>
                <Th>Event</Th>
                <Th>Amount</Th>
                <Th className="hidden md:table-cell">Reason</Th>
                <Th className="hidden md:table-cell">Created</Th>
                <Th className="hidden lg:table-cell">Stripe</Th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/60 last:border-b-0">
                  <Td>
                    <div className="font-mono text-xs text-tertiary">{r.order.reference}</div>
                    <div className="font-medium">{r.order.buyerName}</div>
                    <div className="label-tech text-muted-foreground">{r.order.buyerEmail}</div>
                  </Td>
                  <Td>
                    <Link
                      href={`/events/${r.order.event.slug}`}
                      target="_blank"
                      className="font-medium hover:text-primary"
                    >
                      {r.order.event.title}
                    </Link>
                  </Td>
                  <Td className="font-display font-bold text-primary">
                    {Money.fromMinor(r.amount, r.currency as Currency).format()}
                  </Td>
                  <Td className="hidden md:table-cell">
                    <Badge variant="outline">{r.reason}</Badge>
                    {r.reasonDetail && (
                      <div className="label-tech mt-1 text-muted-foreground">{r.reasonDetail}</div>
                    )}
                  </Td>
                  <Td className="hidden md:table-cell">{formatEventDate(r.createdAt)}</Td>
                  <Td className="hidden lg:table-cell font-mono text-xs">
                    {r.stripeRefundId ?? '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="border-2 border-outline-variant bg-surface-container-low p-5">
        <h2 className="font-display text-lg font-bold uppercase">About this surface</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Ad-hoc refunds are issued directly via the order detail page (wired in
          a follow-up pass). Stripe webhooks for <code>charge.refunded</code> and
          <code> charge.refund.updated</code> are already handled and will populate
          this list automatically — including refunds organisers or Stripe Radar
          initiate.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href="https://dashboard.stripe.com/test/disputes"
            target="_blank"
            rel="noreferrer"
          >
            Open disputes dashboard on Stripe →
          </a>
        </Button>
      </section>
    </div>
  );
}

function Th({ children, className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`label-tech px-4 py-3 text-tertiary ${className ?? ''}`} {...rest}>
      {children}
    </th>
  );
}

function Td({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-top ${className ?? ''}`} {...rest}>
      {children}
    </td>
  );
}

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'hazard';
}) {
  const text = variant === 'hazard' ? 'text-secondary' : 'text-primary';
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-4">
      <div className="label-tech text-tertiary">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
