import { requireSuperAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { inviteAdmin, setUserRole } from '@/server/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEventDate } from '@/lib/format';
import type { UserRole } from '@prisma/client';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const me = await requireSuperAdmin();

  const admins = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Platform access</div>
        <h1 className="text-display-md uppercase">Admin users</h1>
        <p className="mt-3 max-w-prose text-on-surface-variant">
          Admins see /admin; SUPERADMINs additionally manage integrations and
          other admins. Invited users get access the moment they sign in via
          magic link — no separate invite email yet (shipping in a later pass).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Invite / promote</CardTitle>
          <CardDescription>
            Drop in an email. If the user exists, we promote them to the chosen
            role. If not, we create the user at that role so their first sign-in
            drops them straight in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={inviteAdmin} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="role"
                defaultValue="ADMIN"
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </div>
            <Button type="submit">Invite</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            If email delivery isn&rsquo;t set up yet, run{' '}
            <code className="font-mono">pnpm admin:bootstrap &lt;email&gt;</code> on the
            server to generate a one-click sign-in URL for that user.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-tight">
          Current admins
        </h2>
        <div className="border-2 border-outline-variant bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left">
                <Th>Email</Th>
                <Th>Role</Th>
                <Th className="hidden md:table-cell">Added</Th>
                <Th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {admins.map((u) => {
                const isSelf = u.id === me.id;
                return (
                  <tr key={u.id} className="border-b border-outline-variant/60 last:border-b-0">
                    <Td>
                      <div className="font-medium">{u.email}</div>
                      {isSelf && <div className="label-tech text-tertiary">You</div>}
                    </Td>
                    <Td>
                      <Badge variant={u.role === 'SUPERADMIN' ? 'default' : 'tech'}>{u.role}</Badge>
                    </Td>
                    <Td className="hidden md:table-cell">{formatEventDate(u.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      {!isSelf && (
                        <div className="flex justify-end gap-2">
                          {u.role === 'ADMIN' && (
                            <RoleForm userId={u.id} role="SUPERADMIN" label="Promote" />
                          )}
                          {u.role === 'SUPERADMIN' && (
                            <RoleForm userId={u.id} role="ADMIN" label="Demote" variant="outline" />
                          )}
                          <RoleForm userId={u.id} role="BUYER" label="Revoke" variant="destructive" />
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({ children, className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`label-tech px-4 py-3 text-tertiary ${className ?? ''}`} {...rest}>
      {children}
    </th>
  );
}

function Td({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-top ${className ?? ''}`} {...rest}>
      {children}
    </td>
  );
}

function RoleForm({
  userId,
  role,
  label,
  variant = 'default',
}: {
  userId: string;
  role: UserRole;
  label: string;
  variant?: 'default' | 'outline' | 'destructive';
}) {
  return (
    <form action={setUserRole.bind(null, userId, role)}>
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
