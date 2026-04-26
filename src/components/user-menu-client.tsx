'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ticket, Receipt, UserCircle, LogOut, ShieldCheck, Calendar, ChevronDown } from 'lucide-react';

/**
 * Client-side dropdown for the authed-user header menu.
 *
 * Why a client component: the previous CSS-only `group-hover:visible`
 * popover didn't open on touch devices — tap = no hover, focus closes
 * on release. Signed-in mobile users couldn't reach Account / Sign out.
 * This version uses a real `useState` toggle, click-outside closes,
 * and Escape key closes.
 */
export function UserMenuClient({
  display,
  isOrganiser,
  isAdmin,
}: {
  display: string;
  isOrganiser: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('touchstart', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('touchstart', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 border-2 border-outline-variant bg-surface-container px-3 text-sm font-medium hover:border-primary"
      >
        <UserCircle className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="hidden max-w-[160px] truncate sm:inline">{display}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 border-2 border-outline-variant bg-surface-container shadow-glow"
        >
          <MenuLink href="/account" icon={UserCircle} onClick={() => setOpen(false)}>Account</MenuLink>
          <MenuLink href="/account/tickets" icon={Ticket} onClick={() => setOpen(false)}>My tickets</MenuLink>
          <MenuLink href="/account/orders" icon={Receipt} onClick={() => setOpen(false)}>Order history</MenuLink>

          {isOrganiser && (
            <>
              <div className="my-1 border-t border-outline-variant/60" aria-hidden="true" />
              <MenuLink href="/organiser" icon={Calendar} onClick={() => setOpen(false)}>Organiser dashboard</MenuLink>
            </>
          )}

          {isAdmin && (
            <MenuLink href="/admin" icon={ShieldCheck} onClick={() => setOpen(false)}>Admin dashboard</MenuLink>
          )}

          <div className="my-1 border-t border-outline-variant/60" aria-hidden="true" />
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-surface-container-high"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container-high hover:text-primary"
    >
      <Icon className="h-4 w-4 text-tertiary" aria-hidden={true} />
      {children}
    </Link>
  );
}
