import { NextResponse } from 'next/server';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Attendee CSV export — RFC 4180. Streams every ticket for the given
 * event owned by the calling organiser. Use for door lists, reconciliation,
 * or bulk comms via your own ESP.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireOrganiser();
  const { id } = await params;

  const event = await db.event.findFirst({
    where: { id, organiser: { members: { some: { userId: user.id } } } },
    select: { id: true, title: true, slug: true, startsAt: true },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tickets = await db.ticket.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: 'asc' },
    include: {
      ticketType: { select: { name: true, priceFaceValue: true, currency: true } },
      order: {
        select: {
          reference: true,
          paidAt: true,
          totalAmount: true,
          currency: true,
          buyerEmail: true,
          buyerName: true,
        },
      },
    },
  });

  const header = [
    'Door code',
    'Holder name',
    'Holder email',
    'Ticket type',
    'Ticket price',
    'Order reference',
    'Order total',
    'Paid at (UTC)',
    'Buyer name',
    'Buyer email',
    'Ticket status',
    'Issued at (UTC)',
  ];

  const rows = tickets.map((t) => {
    const facePrice = Money.fromMinor(t.ticketType.priceFaceValue, t.ticketType.currency as Currency).toMajorString();
    const orderTotal = Money.fromMinor(t.order.totalAmount, t.order.currency as Currency).toMajorString();
    return [
      t.doorCode,
      t.holderName,
      t.holderEmail,
      t.ticketType.name,
      facePrice,
      t.order.reference,
      orderTotal,
      t.order.paidAt?.toISOString() ?? '',
      t.order.buyerName,
      t.order.buyerEmail,
      t.status,
      t.issuedAt.toISOString(),
    ];
  });

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');

  const safeSlug = event.slug.replace(/[^a-z0-9-]/gi, '');
  const filename = `droptix-attendees-${safeSlug}-${event.startsAt.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function csvEscape(cell: string): string {
  if (cell == null) return '';
  const s = String(cell);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
