import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { upsertCommissionRule } from '@/server/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Commission rules' };
export const dynamic = 'force-dynamic';

export default async function CommissionPage() {
  await requireAdmin();

  const platformDefault = await db.commissionRule.findFirst({
    where: { organiserId: null, effectiveUntil: null },
    orderBy: { effectiveFrom: 'desc' },
  });

  const organisers = await db.organiser.findMany({
    orderBy: { name: 'asc' },
    include: {
      commissionRules: {
        where: { effectiveUntil: null },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Platform</div>
        <h1 className="text-display-md uppercase">Commission rules</h1>
        <p className="mt-3 max-w-prose text-on-surface-variant">
          Rules are versioned — saving creates a new row and retires the previous
          one, so historical invoices are always reproducible.
        </p>
      </header>

      <RuleCard
        title="Platform default"
        description="Applied to any organiser without a bespoke rule."
        organiserId={null}
        rule={platformDefault}
        serial="RULE-PLATFORM"
      />

      <section>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-tight">
          Per-organiser overrides
        </h2>
        <div className="flex flex-col gap-4">
          {organisers.map((o) => (
            <RuleCard
              key={o.id}
              title={o.name}
              description={o.email}
              organiserId={o.id}
              rule={o.commissionRules[0] ?? null}
              serial={`RULE-${o.id.slice(-6).toUpperCase()}`}
              statusBadge={o.status}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function RuleCard({
  title,
  description,
  organiserId,
  rule,
  serial,
  statusBadge,
}: {
  title: string;
  description: string;
  organiserId: string | null;
  rule: {
    percentageBps: number;
    perTicketFee: bigint;
    feeMode: string;
    freeEventsZeroFee: boolean;
    note: string | null;
  } | null;
  serial: string;
  statusBadge?: string;
}) {
  const percentDefault = rule ? (rule.percentageBps / 100).toFixed(2) : '5.00';
  const perTicketDefault = rule ? (Number(rule.perTicketFee) / 100).toFixed(2) : '0.50';
  const feeMode = rule?.feeMode ?? 'PASSED_TO_BUYER';
  const freeEventsZeroFee = rule?.freeEventsZeroFee ?? true;

  return (
    <Card serial={serial}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {statusBadge && statusBadge !== 'ACTIVE' && (
                <Badge variant="outline">{statusBadge}</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {rule ? <Badge variant="success">Configured</Badge> : <Badge variant="outline">Inherits default</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <form action={upsertCommissionRule} className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {organiserId && <input type="hidden" name="organiserId" value={organiserId} />}

          <div>
            <Label htmlFor={`${serial}-pct`}>Percentage</Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${serial}-pct`}
                name="percentage"
                inputMode="decimal"
                defaultValue={percentDefault}
                required
                className="font-mono"
              />
              <span className="label-tech text-tertiary">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor={`${serial}-fixed`}>Per-ticket fee</Label>
            <div className="flex items-center gap-1">
              <span className="label-tech text-tertiary">£</span>
              <Input
                id={`${serial}-fixed`}
                name="perTicketFee"
                inputMode="decimal"
                defaultValue={perTicketDefault}
                required
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${serial}-mode`}>Fee mode</Label>
            <select
              id={`${serial}-mode`}
              name="feeMode"
              defaultValue={feeMode}
              className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
            >
              <option value="PASSED_TO_BUYER">Passed to buyer</option>
              <option value="ABSORBED_BY_ORGANISER">Absorbed by organiser</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label
              htmlFor={`${serial}-free`}
              className="inline-flex cursor-pointer items-center gap-2 border border-outline-variant bg-surface-container-high px-3 py-2 label-tech has-[:checked]:border-primary has-[:checked]:bg-primary/20 has-[:checked]:text-primary"
            >
              <input
                id={`${serial}-free`}
                name="freeEventsZeroFee"
                type="checkbox"
                defaultChecked={freeEventsZeroFee}
              />
              Zero fee on free events
            </label>
          </div>

          <div className="col-span-2 md:col-span-4">
            <Label htmlFor={`${serial}-note`}>Note (optional)</Label>
            <Input id={`${serial}-note`} name="note" placeholder="e.g. 'Volume deal, Q2 2026'" />
          </div>

          <div className="col-span-2 md:col-span-4">
            <Button type="submit">{rule ? 'Save new version' : 'Create rule'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
