import Link from 'next/link';
import { requireOrganiser } from '@/server/guards';
import { createVenue } from '@/server/venues';
import { VenueForm } from '@/components/venue-form';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Add venue' };
export const dynamic = 'force-dynamic';

export default async function OrganiserNewVenuePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await requireOrganiser();
  const { returnTo } = await searchParams;
  // Route back to event creation by default; admins hitting this can
  // still overrride via the returnTo querystring.
  const redirectTo = returnTo?.startsWith('/') ? returnTo : '/organiser/events/new';

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href={redirectTo} className="hover:text-primary">
          {redirectTo.startsWith('/organiser/events') ? 'Event creation' : 'Back'}
        </Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">Add venue</span>
      </nav>

      <header>
        <Badge variant="tech" className="mb-3">New venue</Badge>
        <h1 className="text-display-md uppercase">Add a venue</h1>
        <p className="mt-3 text-on-surface-variant max-w-prose">
          Can&rsquo;t see your venue in the dropdown? Add it here and we&rsquo;ll pop you straight
          back to the event you were creating. The admin curates and tidies the venue list later
          so a rename won&rsquo;t break your events.
        </p>
      </header>

      <VenueForm action={createVenue} redirectTo={redirectTo} submitLabel="Add venue" />
    </div>
  );
}
