import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'Payouts' };
export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage() {
  await requireAdmin();

  const payouts = await db.payout.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { organiser: { select: { name: true, slug: true } } },
  });

  const totals = payouts.reduce(
    (acc, p) => {
      if (p.status === 'PAID') acc.paid += p.amount;
      if (p.status === 'PENDING' || p.status === 'IN_TRANSIT') acc.pending += p.amount;
      if (p.status === 'FAILED' || p.status === 'REVERSED') acc.failed += p.amount;
      return acc;
    },
    { paid: 0n, pending: 0n, failed: 0n },
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Money</div>
        <h1 className="text-display-md uppercase">Payouts</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid (last 200)" value={Money.fromMinor(totals.paid, 'GBP').format()} />
        <StatCard label="In flight" value={Money.fromMinor(totals.pending, 'GBP').format()} variant="hazard" />
        <StatCard label="Failed / reversed" value={Money.fromMinor(totals.failed, 'GBP').format()} variant="destructive" />
      </div>

      {payouts.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
          No payouts yet. We release funds T+7 days after event end.
        </div>
      ) : (
        <div className="border-2 border-outline-variant bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left">
                <Th>Organiser</Th>
                <Th>Amount</Th>
                <Th className="hidden md:table-cell">Created</Th>
                <Th className="hidden md:table-cell">Arrives</Th>
                <Th>Status</Th>
                <Th className="hidden lg:table-cell">Stripe ID</Th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-outline-variant/60 last:border-b-0">
                  <Td>
                    <div className="font-medium">{p.organiser.name}</div>
                    <div className="label-tech text-muted-foreground">{p.organiser.slug}</div>
                  </Td>
                  <Td className="font-display font-bold text-primary">
                    {Money.fromMinor(p.amount, p.currency as Currency).format()}
                  </Td>
                  <Td className="hidden md:table-cell">{formatEventDate(p.createdAt)}</Td>
                  <Td className="hidden md:table-cell">
                    {p.arrivesAt ? formatEventDate(p.arrivesAt) : '—'}
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        p.status === 'PAID'
                          ? 'success'
                          : p.status === 'PENDING' || p.status === 'IN_TRANSIT'
                          ? 'tech'
                          : 'destructive'
                      }
                    >
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="hidden lg:table-cell font-mono text-xs">
                    {p.stripePayoutId ?? '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    <td className={`px-4 py-3 ${className ?? ''}`} {...rest}>
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
  variant?: 'default' | 'hazard' | 'destructive';
}) {
  const border =
    variant === 'hazard' ? 'border-secondary' : variant === 'destructive' ? 'border-destructive' : 'border-outline-variant';
  const text =
    variant === 'hazard' ? 'text-secondary' : variant === 'destructive' ? 'text-destructive' : 'text-primary';
  return (
    <div className={`border-2 ${border} bg-surface-container p-4`}>
      <div className="label-tech text-tertiary">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
