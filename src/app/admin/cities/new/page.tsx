import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { createCity } from '@/server/cities';
import { CityForm } from '@/components/city-form';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'New city' };
export const dynamic = 'force-dynamic';

export default async function NewCityPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/admin/cities" className="hover:text-primary">Cities</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">New</span>
      </nav>

      <header>
        <Badge variant="tech" className="mb-3">Add city</Badge>
        <h1 className="text-display-md uppercase">New city</h1>
      </header>

      <CityForm action={createCity} submitLabel="Create city" />
    </div>
  );
}
