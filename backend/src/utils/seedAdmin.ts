import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { env } from '../config/env';

/**
 * Ensure the intended active Admin account exists in the database.
 *
 * The account is identified by email (env.adminEmail, defaulting to
 * admin@gceetechhub.in). If that exact account is missing it is created from
 * the environment (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME); if it exists
 * but was disabled it is re-activated. Existing records are never deleted.
 */
export async function ensureAdminSeeded(): Promise<void> {
  try {
    const email = (env.adminEmail || 'admin@gceetechhub.in').toLowerCase().trim();
    if (!email) return;

    const existing = await Admin.findOne({ email });
    if (existing) {
      if (existing.isActive === false) {
        existing.isActive = true;
        await existing.save();
        console.log(`[seedAdmin] Re-activated admin account: ${email}`);
      }
      return;
    }

    const password = env.adminPassword || 'Admin@123';
    const name = env.adminName || 'GCEE Tech Hub Admin';
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({
      name,
      email,
      passwordHash,
      role: 'superadmin',
      isActive: true,
    });
    console.log(`[seedAdmin] Admin account auto-created: ${email}`);
  } catch (err: any) {
    console.error('[seedAdmin] Failed to ensure admin seeded:', err.message);
  }
}
