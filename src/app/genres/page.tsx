import Link from 'next/link';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Events by genre',
  description: 'Every music genre on Droptix — techno, drum & bass, rock, indie, hip-hop and more.',
};

export const dynamic = 'force-dynamic';

export default async function GenresPage() {
  const cats = await db.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: {
          events: {
            where: {
              event: { status: 'ON_SALE', startsAt: { gte: new Date() }, publishedAt: { not: null } },
            },
          },
        },
      },
    },
  });

  const active = cats.filter((c) => c._count.events > 0);

  return (
    <main id="main" className="container py-12 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <Badge variant="tech" className="mb-4">Genres</Badge>
        <h1 className="text-display-lg uppercase">Browse by genre</h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Find your sound. Every genre on Droptix with shows live right now.
        </p>
      </header>

      {active.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">No genres have live events yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {active.map((c) => (
            <Link
              key={c.slug}
              href={`/genres/${c.slug}`}
              className="group flex flex-col justify-between border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div>
                <div className="label-tech text-tertiary">Genre</div>
                <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-tight group-hover:text-primary">
                  {c.name}
                </h2>
              </div>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold text-primary">
                  {c._count.events}
                </span>
                <span className="label-tech text-muted-foreground">
                  {c._count.events === 1 ? 'event' : 'events'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
