'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Industrial toast surface — sharp corners, heavy border, no shadow.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'border-2 border-outline-variant bg-surface-container text-on-surface',
        },
      }}
    />
  );
}
