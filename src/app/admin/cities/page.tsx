import Link from 'next/link';
import { Plus, Star, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { deleteCity, backfillCitiesFromVenues } from '@/server/cities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Cities' };
export const dynamic = 'force-dynamic';

export default async function AdminCitiesPage() {
  await requireAdmin();

  const cities = await db.city.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { venues: true } } },
  });

  const orphanVenueCount = await db.venue.count({ where: { cityRefId: null } });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tech mb-2 text-tertiary">Platform</div>
          <h1 className="text-display-md uppercase">Cities</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-prose">
            Editorial metadata for UK cities &mdash; featured flag controls the homepage city
            rail. Venues are linked to a canonical City via Backfill below.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/cities/new">
            <Plus className="h-4 w-4" aria-hidden="true" /> New city
          </Link>
        </Button>
      </header>

      {orphanVenueCount > 0 && (
        <form
          action={async () => {
            'use server';
            await backfillCitiesFromVenues();
          }}
          className="border-2 border-secondary bg-secondary/10 p-4"
        >
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="font-display text-lg font-bold uppercase">Backfill needed</div>
              <p className="text-sm text-on-surface-variant">
                {orphanVenueCount} venue{orphanVenueCount === 1 ? '' : 's'} not yet linked to a City
                row. Click to auto-create missing cities from venue data.
              </p>
            </div>
            <Button type="submit" variant="secondary">Run backfill</Button>
          </div>
        </form>
      )}

      <div className="border-2 border-outline-variant bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high text-left">
              <Th>City</Th>
              <Th className="hidden md:table-cell">Region</Th>
              <Th className="hidden md:table-cell">Country</Th>
              <Th className="hidden lg:table-cell">Venues</Th>
              <Th>Featured</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {cities.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No cities yet. Run the backfill above, or add manually.
                </td>
              </tr>
            ) : (
              cities.map((c) => (
                <tr key={c.id} className="border-b border-outline-variant/60 last:border-b-0">
                  <Td>
                    <div className="font-medium">{c.name}</div>
                    <div className="label-tech text-muted-foreground font-mono">{c.slug}</div>
                  </Td>
                  <Td className="hidden md:table-cell">{c.region ?? '—'}</Td>
                  <Td className="hidden md:table-cell font-mono">{c.country}</Td>
                  <Td className="hidden lg:table-cell">
                    <Badge variant={c._count.venues > 0 ? 'tech' : 'outline'}>
                      {c._count.venues}
                    </Badge>
                  </Td>
                  <Td>
                    {c.featured ? (
                      <Badge variant="default">
                        <Star className="h-3 w-3" aria-hidden="true" />
                        Featured
                      </Badge>
                    ) : (
                      <span className="label-tech text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={`/uk/${c.slug}`}
                          target="_blank"
                          aria-label={`View ${c.name} public page`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/cities/${c.id}/edit`}>Edit</Link>
                      </Button>
                      {c._count.venues === 0 && (
                        <form action={deleteCity.bind(null, c.id)}>
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
