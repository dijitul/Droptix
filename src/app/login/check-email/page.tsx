import { Mail } from 'lucide-react';

export const metadata = { title: 'Check your email' };

export default function CheckEmailPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6 py-12"
    >
      <div className="flex h-14 w-14 items-center justify-center border-2 border-primary bg-primary-soft">
        <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-muted-foreground">
        We&rsquo;ve sent you a magic link. Tap it on this device to sign in. The link expires in 15
        minutes.
      </p>
      <p className="text-sm text-muted-foreground">
        Can&rsquo;t find it? Check spam, then{' '}
        <a href="/login" className="text-primary underline">
          try again
        </a>
        .
      </p>
    </main>
  );
}
