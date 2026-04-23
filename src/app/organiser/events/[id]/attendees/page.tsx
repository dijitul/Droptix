import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      ticketType: { select: { name: true } },
      order: { select: { reference: true, paidAt: true } },
    },
    take: 500,
  });

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
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {q ? 'No matches.' : 'No tickets issued yet.'}
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
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
                </tr>
              ))
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
