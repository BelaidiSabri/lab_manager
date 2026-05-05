import User from './models/User';
import Profile from './models/Profile';
import { hashPassword } from './utils/password';

/**
 * Creates the seeded super admin if no user with that email exists.
 * Requires SUPER_ADMIN_PASSWORD (min 8 chars); optional SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME.
 */
export async function seedSuperAdmin(): Promise<void> {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@lab.local').toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.warn(
      '[seed] SUPER_ADMIN_PASSWORD not set or shorter than 8 characters — skipping super_admin seed. Add it to .env and restart (or run npm run seed).'
    );
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return;
  }

  const u = await User.create({
    name: process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin',
    email,
    passwordHash: await hashPassword(password),
    role: 'super_admin',
    isFirstLogin: true,
    isActive: true,
    createdBy: null,
  });

  await Profile.create({ userId: u._id, academicProfile: {} });
  // eslint-disable-next-line no-console -- startup seed
  console.log(`Seeded super_admin: ${email}`);
}
