'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * Site-wide search input.
 *
 * Two render modes:
 *   - "header"  — slim, dark icon-prefixed input. Sits in the nav row
 *                 from `lg+`. On submit, navigates to /search?q=...
 *   - "menu"    — full-width input for the mobile hamburger sheet.
 *                 Same submit behaviour, larger tap target.
 *
 * Reads ?q from the current search params so the input stays sticky
 * when the user is already on /search and types a refined query.
 */
export function HeaderSearch({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the input synced with ?q when navigating between search pages.
  useEffect(() => {
    if (pathname === '/search') {
      setValue(params.get('q') ?? '');
    } else {
      // Clear when leaving /search so a stale term doesn't sit in the
      // box on unrelated pages.
      setValue('');
    }
  }, [pathname, params]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      router.push('/search');
      return;
    }
    // Preserve any active filters when refining from /search itself
    const next = new URLSearchParams();
    if (pathname === '/search') {
      for (const k of ['city', 'venue', 'organiser', 'genre']) {
        const v = params.get(k);
        if (v) next.set(k, v);
      }
    }
    next.set('q', trimmed);
    router.push(`/search?${next.toString()}`);
  }

  if (variant === 'menu') {
    return (
      <form role="search" onSubmit={onSubmit} className="mb-4">
        <label htmlFor="menu-search" className="label-tech mb-1 block text-tertiary">
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
            aria-hidden="true"
          />
          <input
            id="menu-search"
            ref={inputRef}
            type="search"
            inputMode="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Events, venues, promoters…"
            aria-label="Search Droptix"
            className="flex h-12 w-full border-2 border-outline-variant bg-surface-container-high px-3 py-2 pl-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
          />
        </div>
      </form>
    );
  }

  return (
    <form role="search" onSubmit={onSubmit} className="hidden xl:block">
      <label htmlFor="header-search" className="sr-only">
        Search Droptix
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tertiary"
          aria-hidden="true"
        />
        <input
          id="header-search"
          ref={inputRef}
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search…"
          aria-label="Search Droptix"
          className="flex h-9 w-56 border-2 border-outline-variant bg-surface-container-high px-3 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
        />
      </div>
    </form>
  );
}
