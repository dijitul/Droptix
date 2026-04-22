'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Sonner wrapper that picks up our token colours.
 * Mount once in the root layout.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="system"
      position="top-right"
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border bg-card text-card-foreground shadow-md',
        },
      }}
    />
  );
}
