import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { updateCity } from '@/server/cities';
import { CityForm } from '@/components/city-form';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Edit city' };
export const dynamic = 'force-dynamic';

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const city = await db.city.findUnique({
    where: { id },
    include: { _count: { select: { venues: true } } },
  });
  if (!city) notFound();

  const boundUpdate = updateCity.bind(null, city.id);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/admin/cities" className="hover:text-primary">Cities</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">{city.name}</span>
      </nav>

      <header>
        <Badge variant="tech" className="mb-3">
          {city._count.venues} venue{city._count.venues === 1 ? '' : 's'}
        </Badge>
        <h1 className="text-display-md uppercase">{city.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">/uk/{city.slug}</p>
      </header>

      <CityForm action={boundUpdate} defaults={city} submitLabel="Save changes" />
    </div>
  );
}
