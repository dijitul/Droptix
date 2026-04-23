import Link from 'next/link';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { updateProfile } from '@/server/account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  });

  return (
    <main id="main" className="container max-w-2xl py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/account" className="hover:text-primary">Account</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">Profile</span>
      </nav>

      <header className="mt-6 mb-10">
        <h1 className="text-display-md uppercase">Your profile</h1>
        <p className="mt-3 text-on-surface-variant">
          Only your name shows up on tickets. Everything else is for Droptix ops only.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>
            Your name appears on every ticket you buy. Changing it here doesn&rsquo;t re-issue
            existing tickets &mdash; the name on them is a snapshot at purchase time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={user.name ?? ''}
                maxLength={80}
                placeholder="What should we call you?"
              />
            </div>
            <Button type="submit" className="self-start">Save</Button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-6 border-2 border-outline-variant bg-surface-container p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight">Account details</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <Row label="Email" value={user.email} mono />
          <Row
            label="Verified"
            value={user.emailVerified ? <Badge variant="success">Yes</Badge> : <Badge variant="hazard">Pending</Badge>}
          />
          <Row label="Role" value={<Badge variant="tech">{user.role}</Badge>} />
          <Row
            label="Joined"
            value={user.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Need to change your email? Email{' '}
          <a href="mailto:support@droptix.co.uk" className="text-tertiary underline">
            support@droptix.co.uk
          </a>{' '}
          &mdash; self-serve email change coming in a later release.
        </p>
      </section>
    </main>
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
