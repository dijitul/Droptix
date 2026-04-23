import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { setOrganiserStatus } from '@/server/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Organisers' };
export const dynamic = 'force-dynamic';

export default async function AdminOrganisersPage() {
  await requireAdmin();

  const organisers = await db.organiser.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { events: true, payouts: true } },
      commissionRules: {
        where: { effectiveUntil: null },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  });

  const pendingCount = organisers.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tech mb-2 text-tertiary">Platform</div>
          <h1 className="text-display-md uppercase">Organisers</h1>
        </div>
        {pendingCount > 0 && <Badge variant="hazard">{pendingCount} pending approval</Badge>}
      </header>

      <div className="border-2 border-outline-variant bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high text-left">
              <Th>Organiser</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="hidden md:table-cell">Commission</Th>
              <Th className="hidden lg:table-cell">Stripe</Th>
              <Th className="hidden lg:table-cell">Events</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {organisers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No organisers yet.
                </td>
              </tr>
            ) : (
              organisers.map((o) => {
                const rule = o.commissionRules[0];
                return (
                  <tr key={o.id} className="border-b border-outline-variant/60 last:border-b-0">
                    <Td>
                      <div className="font-medium">{o.name}</div>
                      <div className="label-tech text-muted-foreground">{o.email}</div>
                      {o.city && <div className="label-tech text-muted-foreground">{o.city}</div>}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="hidden md:table-cell">
                      {rule ? (
                        <span className="font-mono">
                          {(rule.percentageBps / 100).toFixed(2)}% + £{(Number(rule.perTicketFee) / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">platform default</span>
                      )}
                    </Td>
                    <Td className="hidden lg:table-cell">
                      {o.stripeChargesEnabled && o.stripePayoutsEnabled ? (
                        <Badge variant="success">Live</Badge>
                      ) : o.stripeAccountId ? (
                        <Badge variant="hazard">Onboarding</Badge>
                      ) : (
                        <Badge variant="outline">None</Badge>
                      )}
                    </Td>
                    <Td className="hidden lg:table-cell">{o._count.events}</Td>
                    <Td className="whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        {o.status === 'PENDING' && (
                          <form action={setOrganiserStatus.bind(null, o.id, 'ACTIVE')}>
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
                        )}
                        {o.status === 'ACTIVE' && (
                          <form action={setOrganiserStatus.bind(null, o.id, 'SUSPENDED')}>
                            <Button type="submit" size="sm" variant="outline">
                              Suspend
                            </Button>
                          </form>
                        )}
                        {o.status === 'SUSPENDED' && (
                          <form action={setOrganiserStatus.bind(null, o.id, 'ACTIVE')}>
                            <Button type="submit" size="sm">
                              Reactivate
                            </Button>
                          </form>
                        )}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/organisers/${o.slug}`} target="_blank">Profile</Link>
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'hazard' | 'outline' | 'destructive'> = {
    PENDING: 'hazard',
    ACTIVE: 'success',
    SUSPENDED: 'destructive',
    CLOSED: 'outline',
  };
  return <Badge variant={map[status] ?? 'outline'}>{status}</Badge>;
}
