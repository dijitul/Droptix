'use client';

import { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

/**
 * Mobile hamburger menu.
 *
 * The panel is rendered via createPortal to document.body because the
 * SiteHeader has `backdrop-blur`, which creates a CSS containing block
 * for `position: fixed` descendants. Without the portal the panel gets
 * clipped to the 64px header height — looks like "the menu doesn't
 * work" when it's actually opening but invisible.
 *
 * Other responsibilities:
 *   - body scroll lock while open
 *   - Escape key closes
 *   - auto-close on route change
 *   - aria-modal + role=dialog semantics
 *   - Hamburger button visible only <md (desktop nav takes over above)
 */
export function MobileMenu({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const panel = open && mounted ? (
    <div
      className="fixed inset-0 z-[100] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      id={panelId}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 top-0 z-10 border-b-2 border-primary bg-surface-container p-6 shadow-glow">
        <div className="mb-6 flex items-center justify-between">
          <span className="label-tech text-tertiary">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center border-2 border-outline-variant hover:border-primary hover:text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile primary" className="flex flex-col gap-1">
          <MobileLink href="/discover">Events</MobileLink>
          <MobileLink href="/genres">Genres</MobileLink>
          <MobileLink href="/cities">Cities</MobileLink>
          <MobileLink href="/sell">For organisers</MobileLink>
          <div className="my-3 border-t border-outline-variant/60" aria-hidden="true" />
          {isAuthed ? (
            <>
              <MobileLink href="/account">My account</MobileLink>
              <MobileLink href="/account/tickets">My tickets</MobileLink>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center px-3 py-3 text-left font-display text-lg font-bold uppercase tracking-tight text-destructive hover:bg-surface-container-high"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <MobileLink href="/login">Sign in</MobileLink>
          )}

          <div className="my-3 border-t border-outline-variant/60" aria-hidden="true" />
          <Link
            href="/discover"
            className="inline-flex h-12 items-center justify-center border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-hover"
          >
            Buy tickets
          </Link>
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center border-2 border-outline-variant text-foreground md:hidden"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {panel && mounted ? createPortal(panel, document.body) : null}
    </>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center border-l-4 border-transparent px-3 py-3 font-display text-lg font-bold uppercase tracking-tight hover:border-primary hover:bg-surface-container-high hover:text-primary"
    >
      {children}
    </Link>
  );
}
