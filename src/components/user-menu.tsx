import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { UserMenuClient } from './user-menu-client';

/**
 * Authed user menu in the header. Server-side resolves session, then
 * delegates rendering to a client component that owns the open/close
 * state. Pure CSS hover-only menus don't work on touch devices, so we
 * use Radix DropdownMenu via the client wrapper.
 *
 * Why we re-check membership instead of role alone:
 *   "Organiser dashboard" only makes sense if the user actually owns
 *   an org. Admins without a membership (e.g. the platform admin who
 *   never registered as a promoter) shouldn't be tempted into the
 *   /organiser shell — there's nothing for them there. We check the
 *   OrganiserMember table so the menu reflects reality, not role.
 */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  // Prefer the user's saved name; otherwise show "Account" rather than
  // a half-truncated email-local fragment that looks like a username.
  const display = session.user.name?.trim() || 'Account';
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN';

  // Show the organiser dashboard entry only if the user has at least
  // one membership. Cheap query — covered by the (organiserId, userId)
  // unique index, and it runs once per page render.
  const memberCount = await db.organiserMember.count({ where: { userId: session.user.id } });
  const isOrganiser = memberCount > 0;

  return <UserMenuClient display={display} isOrganiser={isOrganiser} isAdmin={isAdmin} />;
}
