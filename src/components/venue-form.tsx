import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Shared venue form — used by both the admin create/edit pages and the
 * organiser-side "Add venue" flow. The server action handles the route.
 */
type VenueDefaults = {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  capacity?: number | null;
  websiteUrl?: string | null;
  description?: string | null;
  accessibilityNotes?: string | null;
};

export function VenueForm({
  action,
  defaults,
  redirectTo,
  submitLabel = 'Save venue',
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: VenueDefaults;
  redirectTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <Section title="The basics">
        <div>
          <Label htmlFor="v-name">Venue name *</Label>
          <Input
            id="v-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={defaults?.name ?? ''}
            placeholder="e.g. The White Hotel, Soup Kitchen, XOYO"
          />
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="v-addr1">Street address *</Label>
            <Input
              id="v-addr1"
              name="addressLine1"
              required
              defaultValue={defaults?.addressLine1 ?? ''}
              autoComplete="address-line1"
              placeholder="e.g. Dickinson Street"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="v-addr2">Building / unit (optional)</Label>
            <Input
              id="v-addr2"
              name="addressLine2"
              defaultValue={defaults?.addressLine2 ?? ''}
              autoComplete="address-line2"
              placeholder="e.g. Basement, Unit 4"
            />
          </div>
          <div>
            <Label htmlFor="v-city">City *</Label>
            <Input
              id="v-city"
              name="city"
              required
              defaultValue={defaults?.city ?? ''}
              autoComplete="address-level2"
              placeholder="Manchester"
            />
          </div>
          <div>
            <Label htmlFor="v-postcode">Postcode *</Label>
            <Input
              id="v-postcode"
              name="postcode"
              required
              defaultValue={defaults?.postcode ?? ''}
              autoComplete="postal-code"
              className="uppercase font-mono"
              placeholder="M3 5EN"
            />
          </div>
          <div>
            <Label htmlFor="v-country">Country</Label>
            <Input
              id="v-country"
              name="country"
              defaultValue={defaults?.country ?? 'GB'}
              autoComplete="country"
              className="uppercase"
              placeholder="GB"
              maxLength={2}
            />
          </div>
          <div>
            <Label htmlFor="v-capacity">Capacity</Label>
            <Input
              id="v-capacity"
              name="capacity"
              type="number"
              min={1}
              max={200000}
              defaultValue={defaults?.capacity ?? ''}
              placeholder="e.g. 400"
            />
          </div>
        </div>
      </Section>

      <Section title="Extras (optional)">
        <div>
          <Label htmlFor="v-website">Website</Label>
          <Input
            id="v-website"
            name="websiteUrl"
            type="url"
            inputMode="url"
            defaultValue={defaults?.websiteUrl ?? ''}
            placeholder="https://thewhitehotel.co.uk"
          />
        </div>
        <div>
          <Label htmlFor="v-desc">Description</Label>
          <Textarea
            id="v-desc"
            name="description"
            rows={3}
            defaultValue={defaults?.description ?? ''}
            placeholder="Short blurb — booth setup, door policy, neighbourhood"
          />
        </div>
        <div>
          <Label htmlFor="v-a11y">Accessibility notes</Label>
          <Textarea
            id="v-a11y"
            name="accessibilityNotes"
            rows={3}
            defaultValue={defaults?.accessibilityNotes ?? ''}
            placeholder="e.g. Step-free access via side door, accessible toilets, no induction loop"
          />
        </div>
      </Section>

      <Button type="submit" size="lg" className="self-start">
        {submitLabel}
      </Button>
    </form>
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
