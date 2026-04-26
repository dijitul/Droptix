'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Cookie consent banner — UK PECR + ICO compliant.
 *
 * What it does:
 *   1. On mount, reads `droptix_consent` from localStorage. If a choice
 *      already exists ('granted' or 'denied'), the banner stays hidden
 *      and the stored choice is pushed to gtag — so GA respects the
 *      user's prior decision on every page load.
 *   2. If no choice exists, renders a sticky bottom-of-screen banner
 *      with three actions:
 *        - Accept (granted)
 *        - Reject (denied)  ← MUST be as easy as Accept (ICO 2023)
 *        - Manage / read more (links to /legal/cookies)
 *   3. After a click, calls `gtag('consent', 'update', {...})` so GA
 *      starts (or stays off) immediately. Defaults are set in the
 *      root layout BEFORE gtag.js loads, so no analytics cookie is
 *      ever set without consent.
 *
 * What it doesn't do:
 *   - No granular per-category toggles. We only have one non-essential
 *     vendor (GA4) so a single accept/reject is honest. If we add
 *     marketing pixels later, this becomes a tabbed Manage panel.
 *   - No third-party CMP. Vendor lock-in for one cookie isn't worth it.
 *
 * Trigger to re-show: any code calling
 *   `localStorage.removeItem('droptix_consent')` then `location.reload()`.
 *   The footer "Cookie settings" link does exactly that.
 */

const STORAGE_KEY = 'droptix_consent';

type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    // gtag is loaded by next/script in layout.tsx — typed loosely
    // because the official @types/gtag.js pulls in a lot we don't need.
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function applyConsent(choice: Choice) {
  if (typeof window === 'undefined') return;
  // Use dataLayer.push directly — gtag() is just a thin wrapper, and
  // doing it this way works whether gtag.js has loaded yet or not
  // (queued events flush on load).
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push([
    'consent',
    'update',
    {
      ad_storage: choice,
      analytics_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
    },
  ]);
}

export function CookieBanner() {
  // `null` = haven't read storage yet (SSR + first paint); after mount
  // either 'show' or 'hide'. Prevents a banner flash for users who
  // already chose.
  const [state, setState] = useState<'loading' | 'show' | 'hide'>('loading');

  useEffect(() => {
    let stored: Choice | null = null;
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Choice | null) ?? null;
    } catch {
      // localStorage blocked (Safari private mode, sandboxed iframe).
      // Default to showing the banner — better to ask than assume.
    }
    if (stored === 'granted' || stored === 'denied') {
      applyConsent(stored);
      setState('hide');
    } else {
      setState('show');
    }
  }, []);

  function choose(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Choice not persisted — banner will reappear on next visit.
      // That's the right failure mode.
    }
    applyConsent(choice);
    setState('hide');
  }

  if (state !== 'show') return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-3xl border-2 border-primary bg-surface-container p-4 shadow-glow sm:inset-x-4 sm:bottom-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="text-sm">
          <div className="label-tech mb-1 text-tertiary">Cookies</div>
          <p className="text-foreground">
            We use a handful of cookies to keep you signed in and to count visits via Google
            Analytics. Analytics is off until you accept. Read the{' '}
            <Link href="/legal/cookies" className="text-primary underline underline-offset-2">
              cookie notice
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col md:flex-row">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="inline-flex h-10 flex-1 items-center justify-center border-2 border-outline-variant bg-surface-container-high px-4 font-display text-sm font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="inline-flex h-10 flex-1 items-center justify-center border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Footer button that re-opens the consent banner. Resetting the
 * stored choice is the simplest way to do this — the banner reads
 * localStorage on mount, so reload-after-clear puts it back on screen.
 */
export function CookieResetButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="text-on-surface-variant hover:text-primary transition-colors"
    >
      {children}
    </button>
  );
}
