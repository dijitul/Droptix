import Link from 'next/link';
import { Plus, Search, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { deleteVenue } from '@/server/venues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Venues' };
export const dynamic = 'force-dynamic';

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;

  const venues = await db.venue.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { city: { contains: q } },
            { postcode: { contains: q.toUpperCase() } },
          ],
        }
      : undefined,
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tech mb-2 text-tertiary">Platform</div>
          <h1 className="text-display-md uppercase">Venues</h1>
        </div>
        <Button asChild>
          <Link href="/admin/venues/new">
            <Plus className="h-4 w-4" aria-hidden="true" /> New venue
          </Link>
        </Button>
      </header>

      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, city, postcode…"
            className="pl-9"
            aria-label="Search venues"
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="border-2 border-outline-variant bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high text-left">
              <Th>Venue</Th>
              <Th className="hidden md:table-cell">City</Th>
              <Th className="hidden md:table-cell">Capacity</Th>
              <Th className="hidden lg:table-cell">Events</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {venues.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {q ? 'No venues match that filter.' : 'No venues yet — add your first.'}
                </td>
              </tr>
            ) : (
              venues.map((v) => (
                <tr key={v.id} className="border-b border-outline-variant/60 last:border-b-0">
                  <Td>
                    <div className="font-medium">{v.name}</div>
                    <div className="label-tech text-muted-foreground font-mono">
                      {v.postcode}
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell">{v.city}</Td>
                  <Td className="hidden md:table-cell">
                    {v.capacity ? v.capacity.toLocaleString('en-GB') : '—'}
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <Badge variant={v._count.events > 0 ? 'tech' : 'outline'}>
                      {v._count.events}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={`/venues/${v.slug}`}
                          target="_blank"
                          aria-label={`View ${v.name} public page`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/venues/${v.id}/edit`}>Edit</Link>
                      </Button>
                      {v._count.events === 0 && (
                        <form action={deleteVenue.bind(null, v.id)}>
                          <Button type="submit" size="sm" variant="destructive">
                            Delete
                          </Button>
                        </form>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
