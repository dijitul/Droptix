'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Wraps a destructive admin server action that requires a slug
 * confirmation. Pops a window.confirm, then a window.prompt for the
 * exact slug, then invokes the action. Toasts the error on failure
 * (server actions normally throw to the error boundary, which is
 * heavy-handed for "you typed the slug wrong").
 *
 * The action signature must be (id: string, confirmSlug: string).
 */
export function PurgeButton({
  action,
  id,
  slug,
  label,
  warning,
}: {
  action: (id: string, confirmSlug: string) => Promise<void>;
  id: string;
  slug: string;
  label: string;
  warning: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onClick() {
    if (confirming || isPending) return;
    setConfirming(true);
    try {
      const ok = window.confirm(`${warning}\n\nType the slug "${slug}" on the next prompt to confirm.`);
      if (!ok) return;
      const typed = window.prompt(`Type "${slug}" exactly to purge:`);
      if (typed !== slug) {
        toast.error('Slug mismatch — purge cancelled.');
        return;
      }
      startTransition(async () => {
        try {
          await action(id, slug);
          toast.success(`Purged ${slug}.`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Purge failed.';
          if (!/NEXT_REDIRECT/.test(msg)) toast.error(msg);
        }
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      onClick={onClick}
      disabled={isPending}
      aria-label={`${label} ${slug}`}
    >
      {isPending ? 'Purging…' : label}
    </Button>
  );
}
