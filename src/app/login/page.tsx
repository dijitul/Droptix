import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Droptix with a magic link — no passwords.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-display-md uppercase">Sign in to Droptix</h1>
        <p className="mt-2 text-on-surface-variant">
          Pop your email in and we&rsquo;ll send you a magic link. No passwords ever.
        </p>
      </div>

      {error && (
        <div className="mb-4 border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'EmailSignin'
            ? 'Couldn\u2019t send the email — please try again in a moment.'
            : error === 'Verification'
              ? 'Your magic link expired. Grab a fresh one.'
              : error === 'OAuthAccountNotLinked'
                ? 'Please sign in with the same method you used originally.'
                : 'Sign-in failed. Please try again.'}
        </div>
      )}

      <LoginForm callbackUrl={from ?? '/'} />

      <p className="mt-8 text-sm text-muted-foreground">
        By signing in you agree to our{' '}
        <Link href="/legal/terms" className="text-tertiary underline">Terms</Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="text-tertiary underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
