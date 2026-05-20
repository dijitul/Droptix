import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Search, ExternalLink } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResendOrderButton } from './ResendOrderButton';

export const metadata = { title: 'Attendees' };
export const dynamic = 'force-dynamic';

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireOrganiser();
  const { id } = await params;
  const { q } = await searchParams;

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const event = await db.event.findFirst({
    where: isAdmin
      ? { id }
      : { id, organiser: { members: { some: { userId: user.id } } } },
    select: {
      id: true,
      title: true,
      slug: true,
      ticketTypes: { select: { id: true, capacity: true, soldCount: true, name: true } },
    },
  });
  if (!event) notFound();

  const tickets = await db.ticket.findMany({
    where: {
      eventId: event.id,
      ...(q
        ? {
            OR: [
              { holderName: { contains: q } },
              { holderEmail: { contains: q } },
              { doorCode: { contains: q.toUpperCase() } },
              { order: { reference: { contains: q.toUpperCase() } } },
            ],
          }
        : {}),
    },
    // Group tickets in the same order together by ordering by orderId
    // first, then by issue time. Lets us render one "Resend email"
    // button per order group without duplicating against every ticket.
    orderBy: [{ orderId: 'asc' }, { issuedAt: 'asc' }],
    include: {
      ticketType: { select: { name: true } },
      order: { select: { id: true, reference: true, paidAt: true, buyerEmail: true, status: true } },
    },
    take: 500,
  });

  // Track which orderId we've already drawn the Resend button for so
  // each order only gets one button in the table.
  const seenOrders = new Set<string>();

  const sold = event.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
  const cap = event.ticketTypes.reduce((s, t) => s + t.capacity, 0);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/organiser/events" className="hover:text-primary">Events</Link>
        <span className="mx-2 text-outline">/</span>
        <Link href={`/organiser/events/${event.id}/edit`} className="hover:text-primary">
          {event.title}
        </Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">Attendees</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="tech" className="mb-3">Attendees · {sold}/{cap}</Badge>
          <h1 className="text-display-md uppercase">{event.title}</h1>
        </div>
        <Button asChild>
          <a href={`/api/organiser/events/${event.id}/attendees.csv`} download>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        </Button>
      </header>

      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search name, email, door code…"
            className="pl-9"
            aria-label="Search attendees"
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="border-2 border-outline-variant bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high text-left">
              <Th>Holder</Th>
              <Th>Type</Th>
              <Th>Door code</Th>
              <Th className="hidden md:table-cell">Order</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  {q ? 'No matches.' : 'No tickets issued yet.'}
                </td>
              </tr>
            ) : (
              tickets.map((t) => {
                // First time we see this orderId in the loop, render
                // the Resend button (one email re-fire per order
                // covers every ticket in that order). Subsequent
                // rows in the same group skip it to keep the table tidy.
                const isFirstOfOrder = !seenOrders.has(t.order.id);
                if (isFirstOfOrder) seenOrders.add(t.order.id);

                return (
                  <tr key={t.id} className="border-b border-outline-variant/60 last:border-b-0">
                    <Td>
                      <div className="font-medium">{t.holderName}</div>
                      <div className="label-tech text-muted-foreground">{t.holderEmail}</div>
                    </Td>
                    <Td>{t.ticketType.name}</Td>
                    <Td className="font-mono text-sm">{t.doorCode}</Td>
                    <Td className="hidden md:table-cell font-mono text-xs">{t.order.reference}</Td>
                    <Td className="hidden md:table-cell">
                      <TicketStatusBadge status={t.status} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {/* View / download — /tickets/[id] renders the
                            full QR + venue info. Browser Print = PDF
                            download for the buyer. */}
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={`/tickets/${t.id}`}
                            target="_blank"
                            aria-label={`View ticket ${t.doorCode}`}
                            title="View the buyer's ticket (open in a new tab; print to download as PDF)"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="ml-1 hidden sm:inline">View</span>
                          </Link>
                        </Button>
                        {/* One Resend button per order group. PAID-only
                            because the server-side guard refuses other
                            statuses. */}
                        {isFirstOfOrder && t.order.status === 'PAID' && (
                          <ResendOrderButton
                            orderId={t.order.id}
                            reference={t.order.reference}
                            buyerEmail={t.order.buyerEmail}
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {tickets.length >= 500 && (
        <p className="label-tech text-muted-foreground">
          Showing first 500 matches &mdash; use CSV export for the full list.
        </p>
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

function TicketStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'SCANNED' ? 'success'
    : status === 'VOIDED' ? 'destructive'
    : status === 'TRANSFERRED' ? 'hazard'
    : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}
