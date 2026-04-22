import { redirect } from 'next/navigation';
import { requireUser } from '@/server/guards';
import { createConnectAccountLink } from '@/server/organiser';

export const metadata = { title: 'Refreshing link', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Stripe redirects here if the onboarding link expired. We mint a fresh one. */
export default async function RefreshPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  await requireUser();
  const { org } = await searchParams;
  if (!org) redirect('/organiser');
  const url = await createConnectAccountLink(org);
  redirect(url);
}
