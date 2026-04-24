'use client';

import { useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';

// Server actions can type as () => Promise<void> OR () => void | Promise<void>.
type ServerAction = (formData: FormData) => void | Promise<void>;

/**
 * Drop-in client wrapper for any <form> that fires a server action.
 *
 * Why this exists: server actions that `throw new Error("…")` ordinarily
 * bubble up to Next's error boundary and show a generic "Application
 * error" page. That nukes form state and hides the real message.
 * This wrapper:
 *   1. Calls the action inside a transition with try/catch
 *   2. Shows thrown Error.message as a toast (sonner)
 *   3. Preserves form state
 *   4. Re-throws the NEXT_REDIRECT sentinel so redirect() still works
 *
 * Implementation notes
 *  - We DELIBERATELY do not set `action={action}` on the underlying
 *    <form>. With React 19 both `action` and onSubmit fire on submit;
 *    preventDefault on the onSubmit handler doesn't always cancel the
 *    server-action dispatcher, so you get a double-submit where the
 *    native path errors up to the Next error boundary even though the
 *    try/catch toasts the error. JS-only for now — acceptable because
 *    the whole site requires JS (Stripe, Cloudflare Turnstile, etc).
 *  - Scrolls to top on error so the toast is definitely in view on
 *    mobile (sonner defaults to top-right).
 */
export function ServerActionForm({
  action,
  children,
  className,
  onSuccess,
  successMessage,
  ...rest
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
  successMessage?: string;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, 'action' | 'onSubmit'>) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await action(formData);
        if (successMessage) toast.success(successMessage);
        onSuccess?.();
      } catch (err) {
        // Next.js signals redirects by throwing a sentinel — propagate.
        const digest = (err as { digest?: string })?.digest;
        const msg = err instanceof Error ? err.message : String(err);
        if (/NEXT_REDIRECT/i.test(msg) || digest?.startsWith('NEXT_REDIRECT')) {
          throw err;
        }
        // Scroll the toast into view on mobile (sonner is top-right by
        // default, so a top-scroll puts it in the initial viewport).
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        toast.error(msg || 'Something went wrong — please try again.');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      {...rest}
      aria-busy={isPending}
    >
      {children}
      <span className="sr-only" aria-live="polite">
        {isPending ? 'Submitting…' : ''}
      </span>
    </form>
  );
}
