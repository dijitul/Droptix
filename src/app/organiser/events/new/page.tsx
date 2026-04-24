import Link from 'next/link';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { createEvent } from '@/server/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'New event' };
export const dynamic = 'force-dynamic';

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  await requireOrganiser();
  const { venue: preselectVenue } = await searchParams;

  const [categories, venues] = await Promise.all([
    db.category.findMany({ orderBy: { order: 'asc' } }),
    db.venue.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/organiser/events" className="hover:text-primary">Events</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">New</span>
      </nav>

      <header>
        <Badge variant="tech" className="mb-3">Create event</Badge>
        <h1 className="text-display-md uppercase">Tell us about the event.</h1>
        <p className="mt-3 text-on-surface-variant max-w-prose">
          Draft first, polish after. You can edit everything &mdash; title, dates, artwork, ticket
          types &mdash; right up until sales open.
        </p>
      </header>

      <form action={createEvent} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <Section title="The basics">
            <div>
              <Label htmlFor="title">Event title *</Label>
              <Input id="title" name="title" required minLength={3} placeholder="Cutoff · Techno all-nighter" />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" name="subtitle" placeholder="Headliner TBA · strictly 21+" />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required rows={5} placeholder="Set times, line-up, vibe, rules…" />
            </div>
          </Section>

          <Section title="When & where">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startsAt">Start *</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div>
                <Label htmlFor="endsAt">End *</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            <div>
              <Label htmlFor="venueId">Venue</Label>
              <select
                id="venueId"
                name="venueId"
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
                defaultValue={preselectVenue ?? ''}
              >
                <option value="">— Pick a venue —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.city}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Can&rsquo;t see your venue?{' '}
                <Link
                  href="/organiser/venues/new?returnTo=/organiser/events/new"
                  className="text-primary underline"
                >
                  Add one now
                </Link>
                {' '}&mdash; we&rsquo;ll pop you straight back here.
              </p>
            </div>
          </Section>

          <Section title="Audience">
            <div>
              <Label htmlFor="ageRating">Age rating</Label>
              <select
                id="ageRating"
                name="ageRating"
                defaultValue="AGE_18_PLUS"
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
              >
                <option value="ALL">All ages</option>
                <option value="AGE_14_PLUS">14+</option>
                <option value="AGE_16_PLUS">16+</option>
                <option value="AGE_18_PLUS">18+</option>
                <option value="AGE_21_PLUS">21+</option>
              </select>
            </div>
            <div>
              <Label>Genres</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <label
                    key={c.id}
                    className="inline-flex cursor-pointer items-center gap-2 border border-outline-variant bg-surface-container-high px-3 py-1.5 label-tech hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/20 has-[:checked]:text-primary"
                  >
                    <input type="checkbox" name="categories" value={c.slug} className="sr-only" />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="capacity">Total capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                placeholder="e.g. 400"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cap for the whole event — we&rsquo;ll split it across ticket types later.
              </p>
            </div>
          </Section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-2 border-outline-variant bg-surface-container p-5">
            <div className="label-tech mb-3 text-tertiary">Publish as</div>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Publish as</legend>
              <StatusRadio id="status-draft" value="DRAFT" defaultChecked label="Draft" hint="Not visible anywhere. Carry on prepping." />
              <StatusRadio id="status-scheduled" value="SCHEDULED" label="Scheduled" hint="Listed publicly, sales not open yet." />
              <StatusRadio id="status-onsale" value="ON_SALE" label="On sale" hint="Live and selling — needs at least one ticket type." />
            </fieldset>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Save & continue
          </Button>
          <p className="text-xs text-muted-foreground">
            You&rsquo;ll add tickets + artwork on the next screen. Tickets can&rsquo;t go on sale
            without at least one ticket type.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-outline-variant bg-surface-container p-5">
      <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-tight">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function StatusRadio({
  id,
  value,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      aria-label={label}
      className="flex cursor-pointer items-start gap-3 border border-outline-variant p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
    >
      <input
        id={id}
        type="radio"
        name="status"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 accent-primary"
      />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
