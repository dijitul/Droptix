import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CityDefaults = {
  name?: string | null;
  country?: string | null;
  region?: string | null;
  featured?: boolean | null;
  description?: string | null;
};

export function CityForm({
  action,
  defaults,
  submitLabel = 'Save city',
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: CityDefaults;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <section className="border-2 border-outline-variant bg-surface-container p-5">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-tight">City</h2>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="c-name">Name *</Label>
            <Input
              id="c-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={defaults?.name ?? ''}
              placeholder="Manchester"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-region">Region</Label>
              <Input
                id="c-region"
                name="region"
                defaultValue={defaults?.region ?? ''}
                placeholder="North West, Scotland, London…"
              />
            </div>
            <div>
              <Label htmlFor="c-country">Country (ISO)</Label>
              <Input
                id="c-country"
                name="country"
                defaultValue={defaults?.country ?? 'GB'}
                maxLength={2}
                className="uppercase"
                placeholder="GB"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              name="description"
              rows={3}
              defaultValue={defaults?.description ?? ''}
              placeholder="Used on /uk/[city] — the intro blurb under the H1. 150-word cap is a good target."
            />
          </div>

          <label
            htmlFor="c-featured"
            aria-label="Feature on homepage"
            className="flex cursor-pointer items-start gap-3 border border-outline-variant p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              id="c-featured"
              name="featured"
              type="checkbox"
              defaultChecked={Boolean(defaults?.featured)}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="block font-semibold">Feature on homepage</span>
              <span className="block text-xs text-muted-foreground">
                Cities with this flag appear in the homepage city rail (max 8 shown).
              </span>
            </span>
          </label>
        </div>
      </section>

      <Button type="submit" size="lg" className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
