import { redirect } from 'next/navigation';
import { auth } from './auth';

/**
 * Server-side role guards. Call at the top of protected pages.
 * Middleware only checks for a session cookie — this is where we
 * actually enforce role.
 */

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    redirect('/');
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== 'SUPERADMIN') redirect('/');
  return user;
}

export async function requireOrganiser() {
  const user = await requireUser();
  if (
    user.role !== 'ORGANISER' &&
    user.role !== 'ADMIN' &&
    user.role !== 'SUPERADMIN'
  ) {
    redirect('/');
  }
  return user;
}
