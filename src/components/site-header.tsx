import Link from 'next/link';
import { Menu } from 'lucide-react';
import { DroptixMark } from './droptix-mark';

/**
 * Site-wide header — sticky on scroll, translucent ink panel with a
 * bottom hazard stripe. Primary nav is genre-led; the "On sale" CTA
 * is always on the right in primary-lime for thumb-reach on mobile.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-primary/20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Droptix — home"
          className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-tight"
        >
          <DroptixMark className="h-6 w-6 text-primary" />
          <span>Droptix</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          <NavLink href="/discover">Events</NavLink>
          <NavLink href="/genres">Genres</NavLink>
          <NavLink href="/cities">Cities</NavLink>
          <NavLink href="/sell">For Organisers</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/discover"
            className="inline-flex h-10 items-center border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Buy tickets
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center border-2 border-outline-variant text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* Hazard stripe, industrial signature */}
      <div className="hazard-stripe" aria-hidden="true" />
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="label-tech text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
    >
      {children}
    </Link>
  );
}
