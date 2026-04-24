import Link from 'next/link';
import { requireUser } from '@/server/guards';
import { createOrganiserAndStartOnboarding } from '@/server/organiser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { db } from '@/server/db';
import { redirect } from 'next/navigation';
import { ServerActionForm } from '@/components/server-action-form';

export const metadata = { title: 'Start selling' };
export const dynamic = 'force-dynamic';

export default async function StartSellingPage() {
  const user = await requireUser();

  // If this user already owns an organiser, skip straight to onboarding.
  const existing = await db.organiserMember.findFirst({
    where: { userId: user.id, role: 'owner' },
    include: { organiser: true },
  });
  if (existing) redirect(`/organiser/onboarding?org=${existing.organiserId}`);

  return (
    <main id="main" className="container max-w-2xl py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/sell" className="hover:text-primary">For promoters</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">Create account</span>
      </nav>

      <Badge variant="tech" className="mt-6">Step 1 of 3</Badge>
      <h1 className="mt-3 text-display-lg uppercase">Tell us about your nights.</h1>
      <p className="mt-4 text-lg text-on-surface-variant">
        This sets up your organiser profile. Next we&rsquo;ll hand you off to Stripe to verify your
        identity and connect your payout account. Takes about 5 minutes end-to-end.
      </p>

      <ServerActionForm action={createOrganiserAndStartOnboarding} className="mt-10 flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Promoter name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Low End Gathering, Cutoff, Deadbeat Records"
            autoComplete="organization"
          />
          <p className="text-xs text-muted-foreground">
            What punters see on the ticket. Can be your crew name, label or promoter brand.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Home city</Label>
          <Input
            id="city"
            name="city"
            type="text"
            placeholder="Manchester, Bristol, London…"
            autoComplete="address-level2"
          />
          <p className="text-xs text-muted-foreground">
            Helps us surface your events in the right city feeds.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Contact email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user.email ?? ''}
            required
            autoComplete="email"
          />
          <p className="text-xs text-muted-foreground">
            Where payouts notifications + attendee queries land.
          </p>
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full sm:w-auto">
          Continue to identity check
        </Button>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{' '}
          <Link href="/legal/organiser-terms" className="text-tertiary underline">
            Organiser Agreement
          </Link>
          . You&rsquo;ll keep full ownership of your events, brand, and customer data.
        </p>
      </ServerActionForm>
    </main>
  );
}
