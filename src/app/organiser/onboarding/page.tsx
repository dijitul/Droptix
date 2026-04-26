import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { createConnectAccountLink } from '@/server/organiser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Onboarding' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await requireUser();
  const { org: orgId } = await searchParams;

  const membership = orgId
    ? await db.organiserMember.findFirst({
        where: { userId: user.id, organiserId: orgId },
        include: { organiser: true },
      })
    : await db.organiserMember.findFirst({
        where: { userId: user.id, role: 'owner' },
        include: { organiser: true },
      });

  if (!membership) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-display-md uppercase">Organiser not found</h1>
        <p className="text-on-surface-variant">
          Create an organiser profile first.
        </p>
        <Button asChild>
          <Link href="/sell/start">Start here</Link>
        </Button>
      </div>
    );
  }

  const org = membership.organiser;

  // Server action wrapper — creates link, redirects to Stripe hosted onboarding.
  async function beginOnboarding() {
    'use server';
    const url = await createConnectAccountLink(org.id);
    const { redirect } = await import('next/navigation');
    redirect(url);
  }

  const fullyOnboarded = org.stripeChargesEnabled && org.stripePayoutsEnabled;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="label-tech mb-2 text-tertiary">Step 2 of 3 · Identity check</div>
        <h1 className="text-display-md uppercase">Let&rsquo;s get you verified.</h1>
      </div>

      <div className="border-2 border-outline-variant bg-surface-container p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant={fullyOnboarded ? 'success' : 'hazard'}>
            {fullyOnboarded ? 'Verified' : 'Not verified'}
          </Badge>
          <Badge variant={org.stripeChargesEnabled ? 'success' : 'outline'}>
            Charges {org.stripeChargesEnabled ? 'enabled' : 'disabled'}
          </Badge>
          <Badge variant={org.stripePayoutsEnabled ? 'success' : 'outline'}>
            Payouts {org.stripePayoutsEnabled ? 'enabled' : 'disabled'}
          </Badge>
        </div>

        <h2 className="font-display text-xl font-bold uppercase tracking-tight">
          {fullyOnboarded ? 'You&rsquo;re All Set' : 'Finish Stripe onboarding'}
        </h2>
        <p className="mt-3 text-on-surface-variant">
          {fullyOnboarded ? (
            <>
              Stripe has verified your identity and activated payouts. You can start publishing
              events now.
            </>
          ) : (
            <>
              Stripe handles KYC verification and routes payouts directly to your bank. Neither
              Droptix nor anyone else sees your bank details. This usually takes 5 minutes.
              You&rsquo;ll need your business details and a bank account in your legal name.
            </>
          )}
        </p>

        <form action={beginOnboarding} className="mt-6 flex flex-wrap gap-3">
          {fullyOnboarded ? (
            <>
              <Button asChild>
                <Link href="/organiser/events/new">Create your first event</Link>
              </Button>
              <Button type="submit" variant="outline">
                Update Stripe details <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button type="submit" size="lg">
              Continue on Stripe <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </form>
      </div>

      {!fullyOnboarded && (
        <div className="border border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <div className="text-sm text-on-surface-variant">
              <strong className="text-foreground">Heads up:</strong> If the Stripe window doesn&rsquo;t
              open, check your browser&rsquo;s popup blocker. If onboarding expires before you
              finish, come back here &mdash; we&rsquo;ll issue a fresh link.
            </div>
          </div>
        </div>
      )}

      <p className="label-tech text-muted-foreground">
        Droptix organiser ID · <span className="text-tertiary">{org.id}</span>
        {org.stripeAccountId && (
          <>
            {' '}· Stripe · <span className="text-tertiary">{org.stripeAccountId}</span>
          </>
        )}
      </p>

      <div className="text-sm text-muted-foreground">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin align-middle" aria-hidden="true" />
        Status updates automatically when Stripe sends us a webhook.
      </div>
    </div>
  );
}
