import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/server/db';

export default async function AdminDashboard() {
  const [organiserCount, eventCount, integrationCount] = await Promise.all([
    db.organiser.count(),
    db.event.count(),
    db.integration.count(),
  ]);

  const pendingOrganisers = await db.organiser.count({ where: { status: 'PENDING' } });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform health at a glance. Full KPI suite lands in Phase 3.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Organisers" value={organiserCount} sublabel={`${pendingOrganisers} pending`} />
        <Stat label="Events" value={eventCount} sublabel="all-time" />
        <Stat label="Integrations" value={integrationCount} sublabel="configured" />
        <Stat label="Platform" value="Live" sublabel="Phase 0" />
      </div>

      {integrationCount === 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle>Set up integrations</CardTitle>
            <CardDescription>
              Droptix can&rsquo;t process payments, send email, or upload images until you add the
              necessary API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/admin/integrations" className="font-medium text-primary underline">
              Go to Integrations →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {sublabel && <CardContent className="text-xs text-muted-foreground">{sublabel}</CardContent>}
    </Card>
  );
}
