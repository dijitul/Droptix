'use client';

import { useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type ServerAction = (formData: FormData) => Promise<unknown | void>;

/**
 * Drop-in client wrapper for any <form> that fires a server action.
 *
 * Server actions that `throw new Error(...)` ordinarily bubble up to
 * Next's error boundary and show a generic "Application error". That
 * nukes the form's state and hides the actual message from the user.
 *
 * Wrapping the form in this component does three things:
 *   1. Catches thrown errors from the action and shows the message as
 *      a toast (sonner), so the user sees "Add a description — even
 *      short." not "Application error"
 *   2. Preserves form state — the user doesn't lose their typing
 *   3. Tolerates `redirect()` calls inside the action: Next signals
 *      redirects via a special throw (NEXT_REDIRECT) which we detect
 *      and DO rethrow so the redirect actually fires
 *
 * Use:
 *   <ServerActionForm action={createEvent} className="…">
 *     …inputs…
 *     <Button type="submit">Save</Button>
 *   </ServerActionForm>
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
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await action(formData);
        if (successMessage) toast.success(successMessage);
        onSuccess?.();
      } catch (err) {
        // Next.js signals redirects by throwing a sentinel error — let
        // those propagate so the client actually navigates.
        const msg = err instanceof Error ? err.message : String(err);
        if (/NEXT_REDIRECT/i.test(msg) || (err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
          throw err;
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
      // Keep native action as fallback for no-JS users (they'll hit the
      // default Next error boundary, which is still better than nothing).
      action={action}
      aria-busy={isPending}
    >
      {children}
      {/* Invisible busy region so screen readers hear submission state
           without us having to add per-form state management. Non-visual
           feedback lives in the individual Submit button via aria-busy. */}
      <span className="sr-only" aria-live="polite">
        {isPending ? 'Submitting…' : ''}
      </span>
      {void router}
    </form>
  );
}
