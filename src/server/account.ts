'use server';

import { revalidatePath } from 'next/cache';
import { db } from './db';
import { requireUser } from './guards';

export async function updateProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();

  if (name.length > 80) throw new Error('Name too long.');

  await db.user.update({
    where: { id: user.id },
    data: { name: name || null },
  });

  revalidatePath('/account');
  revalidatePath('/account/profile');
}
