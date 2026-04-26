import { auth } from '@/server/auth';
import { UserMenuClient } from './user-menu-client';

/**
 * Authed user menu in the header. Server-side resolves session, then
 * delegates rendering to a client component that owns the open/close
 * state. Pure CSS hover-only menus don't work on touch devices, so we
 * use Radix DropdownMenu via the client wrapper.
 */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  // Prefer the user's saved name; otherwise show "Account" rather than
  // a half-truncated email-local fragment that looks like a username.
  const display = session.user.name?.trim() || 'Account';
  const isOrganiser =
    session.user.role === 'ORGANISER' ||
    session.user.role === 'ADMIN' ||
    session.user.role === 'SUPERADMIN';
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN';

  return <UserMenuClient display={display} isOrganiser={isOrganiser} isAdmin={isAdmin} />;
}
