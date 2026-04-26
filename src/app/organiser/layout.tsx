import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, BarChart3, Users, Settings, Ticket, PoundSterling, ShieldCheck } from 'lucide-react';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { DroptixMark } from '@/components/droptix-mark';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Organiser' };

export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

  // Resolve the current organiser scope (first membership — multi-org UI comes later)
  const membership = await db.organiserMember.findFirst({
    where: { userId: user.id },
    include: { organiser: true },
    orderBy: { createdAt: 'asc' },
  });

  // Admins are allowed through without an organiser membership — they
  // need to be able to view/edit any event from /admin/events without
  // being shoved into the /sell/start signup wizard. Non-admins still
  // get bounced to onboarding.
  if (!membership && !isAdmin) redirect('/sell/start');

  const org = membership?.organiser ?? null;

  const statusBadge = org
    ? org.status === 'ACTIVE'
      ? { label: 'Live', variant: 'success' as const }
      : org.status === 'PENDING'
      ? { label: 'Pending', variant: 'hazard' as const }
      : org.status === 'SUSPENDED'
      ? { label: 'Suspended', variant: 'destructive' as const }
      : { label: 'Closed', variant: 'outline' as const }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim md:flex-row">
      <aside
        aria-label="Organiser navigation"
        className="flex w-full shrink-0 flex-col gap-1 border-b-2 border-outline-variant bg-surface-container p-4 md:h-screen md:w-64 md:border-b-0 md:border-r-2"
      >
        <Link
          href="/organiser"
          className="mb-4 flex items-center gap-2 px-2 py-1 font-display font-bold uppercase tracking-tight"
        >
          <DroptixMark className="h-5 w-5 text-primary" />
          <span>Droptix</span>
        </Link>

        <div className="mb-3 px-2">
          {org && statusBadge ? (
            <>
              <div className="label-tech text-tertiary mb-1">Organiser</div>
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-base font-bold">{org.name}</span>
                <Badge variant={statusBadge.variant} className="shrink-0">
                  {statusBadge.label}
                </Badge>
              </div>
            </>
          ) : (
            // Admin-without-membership view. Surfaced with hazard-tone
            // pill so the admin always knows they're in cross-tenant
            // mode, not running their own org.
            <>
              <div className="label-tech text-tertiary mb-1">Mode</div>
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-base font-bold">Admin view</span>
                <Badge variant="hazard" className="shrink-0">
                  <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                  All orgs
                </Badge>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-outline-variant pt-2">
          <NavLink href="/organiser" icon={BarChart3}>Dashboard</NavLink>
          <NavLink href="/organiser/events" icon={Calendar}>Events</NavLink>
          <NavLink href="/organiser/attendees" icon={Users}>Attendees</NavLink>
          <NavLink href="/organiser/payouts" icon={PoundSterling}>Payouts</NavLink>
          <NavLink href="/organiser/scanner" icon={Ticket}>Door scanner</NavLink>
          <NavLink href="/organiser/settings" icon={Settings}>Settings</NavLink>
        </div>

        <div className="mt-auto border-t border-outline-variant px-2 py-3 text-xs text-muted-foreground">
          <div className="truncate">{user.email}</div>
          {isAdmin ? (
            <Link href="/admin" className="label-tech text-muted-foreground hover:text-primary">
              ← Back to admin
            </Link>
          ) : (
            <Link href="/" className="label-tech text-muted-foreground hover:text-primary">
              ← Back to site
            </Link>
          )}
        </div>
      </aside>

      <main id="main" className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-primary"
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
      {children}
    </Link>
  );
}
