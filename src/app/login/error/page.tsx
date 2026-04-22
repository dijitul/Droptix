import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Sign-in problem' };

export default function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6 py-12"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Sign-in didn&rsquo;t work</h1>
      <p className="text-muted-foreground">
        Your magic link might have expired, or it was opened on a different device to the one you
        signed in from. Grab a fresh one.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Try again</Link>
      </Button>
      <ErrorDetail searchParams={searchParams} />
    </main>
  );
}

async function ErrorDetail({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!params.error) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Reference:{' '}
      <code className="font-mono">{params.error}</code>
    </p>
  );
}
