import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { syncConnectAccountStatus } from '@/server/organiser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Onboarding complete', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OnboardingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await requireUser();
  const { org: orgId } = await searchParams;
  if (!orgId) redirect('/organiser');

  const membership = await db.organiserMember.findFirst({
    where: { userId: user.id, organiserId: orgId },
  });
  if (!membership) redirect('/organiser');

  // Pull fresh status from Stripe so the UI doesn't lag the webhook.
  await syncConnectAccountStatus(orgId);

  const org = await db.organiser.findUniqueOrThrow({ where: { id: orgId } });
  const ready = org.stripeChargesEnabled && org.stripePayoutsEnabled;

  return (
    <div className="flex flex-col gap-6">
      <div className="border-2 border-primary bg-primary/5 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <Badge variant={ready ? 'success' : 'hazard'} className="mb-2">
              {ready ? 'Verified' : 'Almost there'}
            </Badge>
            <h1 className="text-display-md uppercase">
              {ready ? "You're live." : 'Stripe is still checking.'}
            </h1>
            <p className="mt-3 text-on-surface-variant">
              {ready ? (
                <>
                  Stripe has verified your identity and enabled payouts. Create your first event to
                  go on sale.
                </>
              ) : (
                <>
                  Stripe&rsquo;s usually fast but sometimes needs up to 24 hours to finalise checks.
                  We&rsquo;ll email you the moment you&rsquo;re fully activated. You can start
                  drafting events meanwhile.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={ready ? '/organiser/events/new' : '/organiser'}>
            {ready ? 'Create first event' : 'Open dashboard'}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/organiser">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
