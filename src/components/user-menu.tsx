import Link from 'next/link';
import { Ticket, Receipt, UserCircle, LogOut, ShieldCheck, Calendar } from 'lucide-react';
import { auth } from '@/server/auth';

/**
 * Authed user menu in the header.
 *
 * Kept a SERVER component — session lookup happens during render, no
 * client-side auth state. Dropdown markup is raw CSS hover/focus, no
 * Radix popover, because keeping a menu open over a sticky header from
 * an RSC tree is simpler this way.
 */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  const display = session.user.name || session.user.email?.split('@')[0] || 'Account';
  const isOrganiser =
    session.user.role === 'ORGANISER' ||
    session.user.role === 'ADMIN' ||
    session.user.role === 'SUPERADMIN';
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN';

  return (
    <div className="relative group">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 border-2 border-outline-variant bg-surface-container px-3 text-sm font-medium hover:border-primary"
        aria-haspopup="menu"
        aria-expanded="false"
      >
        <UserCircle className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="max-w-[160px] truncate">{display}</span>
      </button>

      <div
        role="menu"
        className="invisible absolute right-0 top-full z-50 mt-1 w-56 border-2 border-outline-variant bg-surface-container opacity-0 shadow-glow transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <MenuLink href="/account" icon={UserCircle}>Account</MenuLink>
        <MenuLink href="/account/tickets" icon={Ticket}>My tickets</MenuLink>
        <MenuLink href="/account/orders" icon={Receipt}>Order history</MenuLink>

        {isOrganiser && (
          <>
            <div className="my-1 border-t border-outline-variant/60" aria-hidden="true" />
            <MenuLink href="/organiser" icon={Calendar}>Organiser dashboard</MenuLink>
          </>
        )}

        {isAdmin && <MenuLink href="/admin" icon={ShieldCheck}>Admin dashboard</MenuLink>}

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
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container-high hover:text-primary"
    >
      <Icon className="h-4 w-4 text-tertiary" aria-hidden={true} />
      {children}
    </Link>
  );
}
