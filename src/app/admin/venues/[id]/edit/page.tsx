import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { updateVenue } from '@/server/venues';
import { VenueForm } from '@/components/venue-form';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Edit venue' };
export const dynamic = 'force-dynamic';

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const venue = await db.venue.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!venue) notFound();

  const boundUpdate = updateVenue.bind(null, venue.id);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/admin/venues" className="hover:text-primary">Venues</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">{venue.name}</span>
      </nav>

      <header className="flex items-end justify-between gap-3">
        <div>
          <Badge variant="tech" className="mb-3">
            {venue._count.events} event{venue._count.events === 1 ? '' : 's'}
          </Badge>
          <h1 className="text-display-md uppercase">{venue.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono">{venue.slug}</p>
        </div>
      </header>

      <VenueForm action={boundUpdate} defaults={venue} submitLabel="Save changes" />
    </div>
  );
}
