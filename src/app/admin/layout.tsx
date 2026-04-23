import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { Ticket, Settings, Users, CreditCard, ShieldCheck, ListChecks, UserCog } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim md:flex-row">
      <aside
        aria-label="Admin navigation"
        className="flex w-full shrink-0 flex-col gap-1 border-b-2 border-outline-variant bg-surface-container p-4 md:h-screen md:w-64 md:border-b-0 md:border-r-2"
      >
        <Link
          href="/admin"
          className="mb-2 flex items-center gap-2 px-2 py-1 font-display font-bold uppercase tracking-tight"
        >
          <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
          Droptix Admin
        </Link>

        <Separator />

        <NavLink href="/admin" icon={ListChecks}>Dashboard</NavLink>
        <NavLink href="/admin/organisers" icon={Users}>Organisers</NavLink>
        <NavLink href="/admin/commission" icon={CreditCard}>Commission rules</NavLink>
        <NavLink href="/admin/payouts" icon={CreditCard}>Payouts</NavLink>
        <NavLink href="/admin/refunds" icon={ShieldCheck}>Refunds & disputes</NavLink>
        {user.role === 'SUPERADMIN' && (
          <NavLink href="/admin/users" icon={UserCog}>Admin users</NavLink>
        )}
        <NavLink href="/admin/integrations" icon={Settings}>Integrations</NavLink>

        <Separator className="my-2" />

        <div className="mt-auto px-2 py-2 text-xs text-muted-foreground">
          <div className="truncate">{user.email}</div>
          <div className="font-medium uppercase tracking-wide">{user.role}</div>
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
