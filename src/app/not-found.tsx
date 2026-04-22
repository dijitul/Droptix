import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: '404' };

export default function NotFound() {
  return (
    <main id="main" className="container grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="label-tech text-tertiary">ERR_404 · NO_RESOURCE</div>
        <h1 className="text-display-xl uppercase text-primary">Lost signal.</h1>
        <p className="max-w-prose text-lg text-on-surface-variant">
          The page you&rsquo;re after isn&rsquo;t here — moved, cancelled, or never existed. The
          scene moves fast.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/discover">Browse events</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
