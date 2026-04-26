import { Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Check your email' };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6 py-12"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-14 w-14 items-center justify-center border-2 border-primary bg-primary-soft">
        <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Link&rsquo;s on its way.</h1>
      {email ? (
        <p className="text-on-surface-variant">
          Link sent to <strong className="text-foreground">{email}</strong>. Open it on this device
          within 15 minutes and you&rsquo;re in.
        </p>
      ) : (
        <p className="text-on-surface-variant">
          Open the link on this device within 15 minutes and you&rsquo;re in.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Not there? Check spam or your Promotions tab &mdash; some clients hide new senders. Still
        nothing?{' '}
        <Link href="/login" className="text-primary underline">
          Send another
        </Link>
        .
      </p>
      {email && (
        <p className="text-xs text-muted-foreground">
          Wrong email?{' '}
          <Link href="/login" className="underline">Change it</Link>.
        </p>
      )}
    </main>
  );
}
