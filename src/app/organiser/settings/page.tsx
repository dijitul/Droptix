import Link from 'next/link';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Organiser settings' };
export const dynamic = 'force-dynamic';

export default async function OrganiserSettingsPage() {
  const user = await requireUser();
  const org = (
    await db.organiserMember.findFirstOrThrow({
      where: { userId: user.id },
      include: { organiser: true },
    })
  ).organiser;

  const rule =
    (await db.commissionRule.findFirst({
      where: {
        organiserId: org.id,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })) ??
    (await db.commissionRule.findFirst({
      where: { organiserId: null },
      orderBy: { effectiveFrom: 'desc' },
    }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Settings</div>
        <h1 className="text-display-md uppercase">Account</h1>
      </header>

      <Card serial={`ID-${org.id.slice(-6).toUpperCase()}`}>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Shown on tickets and the public organiser page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="Name" value={org.name} />
          <Row label="Slug" value={org.slug} mono />
          <Row label="Email" value={org.email} />
          <Row label="City" value={org.city ?? '—'} />
          <Row label="Public URL" value={`/organisers/${org.slug}`} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>Payouts route via Stripe straight to your bank.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row
            label="Status"
            value={
              org.stripeChargesEnabled && org.stripePayoutsEnabled ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="hazard">Pending</Badge>
              )
            }
          />
          <Row label="Stripe account" value={org.stripeAccountId ?? '—'} mono />
          <Row label="Payout hold" value={`T+${org.payoutHoldDays} days after event end`} />
          {!org.stripeChargesEnabled && (
            <Button asChild className="mt-2 w-fit">
              <Link href={`/organiser/onboarding?org=${org.id}`}>Finish onboarding</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {rule && (
        <Card>
          <CardHeader>
            <CardTitle>Your commission rate</CardTitle>
            <CardDescription>Set by the Droptix admin. Talk to us about volume tiers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Percentage" value={`${(rule.percentageBps / 100).toFixed(2)}%`} />
            <Row label="Fixed per ticket" value={`£${(Number(rule.perTicketFee) / 100).toFixed(2)}`} />
            <Row label="Fee mode" value={rule.feeMode === 'PASSED_TO_BUYER' ? 'Passed to buyer' : 'Absorbed'} />
            <Row
              label="Free events"
              value={rule.freeEventsZeroFee ? 'Zero fee' : 'Standard fee applies'}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant/50 pb-2 last:border-b-0 last:pb-0">
      <dt className="label-tech text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-right break-all' : 'text-right'}>{value}</dd>
    </div>
  );
}
