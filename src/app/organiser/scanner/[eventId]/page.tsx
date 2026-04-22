import { notFound } from 'next/navigation';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Scanner } from './Scanner';

export const metadata = { title: 'Scanning', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ScannerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await requireOrganiser();
  const { eventId } = await params;

  const event = await db.event.findFirst({
    where: { id: eventId, organiser: { members: { some: { userId: user.id } } } },
    include: {
      venue: { select: { name: true, city: true } },
      ticketTypes: { select: { soldCount: true } },
    },
  });
  if (!event) notFound();

  const totalSold = event.ticketTypes.reduce((s, t) => s + t.soldCount, 0);

  return (
    <Scanner
      event={{
        id: event.id,
        title: event.title,
        venueName: event.venue?.name ?? null,
        city: event.venue?.city ?? null,
        totalSold,
      }}
    />
  );
}
