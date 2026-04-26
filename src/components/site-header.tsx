import Link from 'next/link';
import { DroptixMark } from './droptix-mark';
import { UserMenu } from './user-menu';
import { MobileMenu } from './mobile-menu';
import { auth } from '@/server/auth';

/**
 * Site-wide header — sticky on scroll, translucent ink panel with a
 * bottom hazard stripe. Primary nav is genre-led; the "On sale" CTA
 * is always on the right in primary-lime for thumb-reach on mobile.
 *
 * Signed-in users see their account menu instead of a "Sign in" link.
 */
export async function SiteHeader() {
  const session = await auth();
  const isAuthed = Boolean(session?.user);

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
          {isAuthed ? (
            <UserMenu />
          ) : (
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline-block"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/discover"
            className="inline-flex h-10 items-center border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Buy tickets
          </Link>
          {/* The MobileMenu is a client component — it owns the hamburger
              button + the slide-down panel. Below md only. */}
          <MobileMenu isAuthed={isAuthed} />
        </div>
      </div>
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
