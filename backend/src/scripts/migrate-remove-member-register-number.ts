/**
 * One-shot, idempotent migration to drop the now-removed `registerNumber` field
 * from every Member document.
 *
 * What it does:
 *  1. Uses $unset to remove ONLY `registerNumber` from each member document.
 *  2. Never touches name, email, profile, socialLinks, role, team, or any
 *     other member data.
 *  3. Records are never deleted.
 *
 * Safe to run repeatedly. Run with:
 *   npm run migrate:remove-member-register-number --prefix backend
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Member } from '../models';

async function migrate() {
  console.log('[migrate:remove-member-register-number] connecting to MongoDB...');
  await connectDB();

  const existing = await Member.countDocuments({ registerNumber: { $exists: true } });
  console.log(`[migrate:remove-member-register-number] found ${existing} member(s) with registerNumber`);

  const result = await Member.updateMany(
    { registerNumber: { $exists: true } },
    { $unset: { registerNumber: '' } }
  );

  console.log(
    `[migrate:remove-member-register-number] removed registerNumber from ${result.modifiedCount} document(s). No members, profiles, or other fields were modified or deleted.`
  );

  await mongoose.connection.close?.();
}

migrate().catch((err) => {
  console.error('[migrate:remove-member-register-number] failed:', err);
  process.exitCode = 1;
});
