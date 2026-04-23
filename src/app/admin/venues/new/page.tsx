import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { createVenue } from '@/server/venues';
import { VenueForm } from '@/components/venue-form';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'New venue' };
export const dynamic = 'force-dynamic';

export default async function NewVenuePage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/admin/venues" className="hover:text-primary">Venues</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">New</span>
      </nav>

      <header>
        <Badge variant="tech" className="mb-3">Add venue</Badge>
        <h1 className="text-display-md uppercase">New venue</h1>
        <p className="mt-3 text-on-surface-variant max-w-prose">
          Adds a new venue that organisers can select when creating events. Hero image upload
          (optional) can be added after save from the edit screen.
        </p>
      </header>

      <VenueForm action={createVenue} redirectTo="/admin/venues" submitLabel="Create venue" />
    </div>
  );
}
