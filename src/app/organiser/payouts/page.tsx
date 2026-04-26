import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'Payouts' };
export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const user = await requireOrganiser();
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const membership = await db.organiserMember.findFirst({
    where: { userId: user.id },
    include: { organiser: true },
  });
  if (!membership) {
    if (isAdmin) redirect('/admin/payouts');
    redirect('/sell/start');
  }
  const org = membership.organiser;

  const payouts = await db.payout.findMany({
    where: { organiserId: org.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Money</div>
        <h1 className="text-display-md uppercase">Payouts</h1>
      </header>

      {!org.stripeChargesEnabled ? (
        <div className="border-2 border-secondary bg-secondary/10 p-5">
          <p className="text-on-surface-variant">
            Payouts start after you finish Stripe Connect onboarding.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/organiser/onboarding?org=${org.id}`}>Finish onboarding</Link>
          </Button>
        </div>
      ) : payouts.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">
            No payouts yet. We release funds T+{org.payoutHoldDays} days after event end.
          </p>
        </div>
      ) : (
        <div className="border-2 border-outline-variant bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left">
                <Th>Created</Th>
                <Th>Amount</Th>
                <Th>Arrives</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-outline-variant/60 last:border-b-0">
                  <Td>{formatEventDate(p.createdAt)}</Td>
                  <Td className="font-display font-bold text-primary">
                    {Money.fromMinor(p.amount, p.currency as Currency).format()}
                  </Td>
                  <Td>{p.arrivesAt ? formatEventDate(p.arrivesAt) : '—'}</Td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="label-tech px-4 py-3 text-tertiary">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}
