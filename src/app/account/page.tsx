import Link from 'next/link';
import { Ticket, Receipt, UserCircle, LogOut } from 'lucide-react';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'My account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();

  const [ticketCount, orderCount] = await Promise.all([
    db.ticket.count({
      where: {
        status: { in: ['ISSUED', 'SCANNED', 'TRANSFERRED'] },
        OR: [{ holderUserId: user.id }, { holderEmail: user.email ?? '' }],
      },
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <header className="mb-10">
        <Badge variant="tech" className="mb-3">Account</Badge>
        <h1 className="text-display-md uppercase">Hey, {user.name ?? user.email?.split('@')[0]}</h1>
        <p className="mt-3 text-on-surface-variant">
          Everything you&rsquo;ve booked plus your profile settings.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <NavCard href="/account/tickets" icon={Ticket} title="My tickets" count={ticketCount} />
        <NavCard href="/account/orders" icon={Receipt} title="Order history" count={orderCount} />
        <NavCard href="/account/profile" icon={UserCircle} title="Profile" />
      </div>

      {(user.role === 'ORGANISER' || user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {user.role === 'SUPERADMIN' || user.role === 'ADMIN' ? 'Platform tools' : 'Organiser tools'}
            </CardTitle>
            <CardDescription>
              {user.role === 'SUPERADMIN' || user.role === 'ADMIN'
                ? 'Jump to the admin surface.'
                : 'Manage events, attendees, payouts.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/organiser">Organiser dashboard</Link>
            </Button>
            {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
              <Button asChild variant="outline">
                <Link href="/admin">Admin dashboard</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <form action="/api/auth/signout" method="POST" className="mt-10">
        <Button type="submit" variant="outline">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </main>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  count,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="h-6 w-6 text-tertiary" aria-hidden={true} />
      <div className="font-display text-lg font-bold uppercase tracking-tight group-hover:text-primary">
        {title}
      </div>
      {count !== undefined && (
        <div className="label-tech text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'}
        </div>
      )}
    </Link>
  );
}
