/**
 * Safe one-shot migration for LEGACY SendingHistory records that were created
 * before `recipientCount` (and the batch tracking fields) existed.
 *
 * What it does (idempotent — safe to run repeatedly):
 *  1. Backfills `recipientCount` on every record missing it. Legacy records
 *     are per-email rows, so each represents exactly one recipient → set to 1.
 *  2. Derives `sentCount`/`failedCount` from the stored status.
 *  3. Defaults `startedAt`/`completedAt` to `sentAt` when absent.
 *  4. Backfills `eventName` from the linked Event document where possible.
 *
 * Nothing is deleted. Run with:  npm run migrate:sending-history --prefix backend
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { connectDB } from '../config/db';
import { SendingHistory, EventModel } from '../models';

async function migrate() {
  console.log('[migrate:sending-history] connecting to MongoDB...');
  await connectDB();

  const filter = {
    $or: [
      { recipientCount: { $exists: false } },
      { recipientCount: null },
    ],
  };

  const legacy = await SendingHistory.find(filter).limit(10000);
  console.log(`[migrate:sending-history] found ${legacy.length} legacy record(s) missing recipientCount`);

  const eventNameCache = new Map<string, string>();
  let updated = 0;

  for (const record of legacy) {
    const eventKey = String(record.eventId ?? '');
    if (!eventNameCache.has(eventKey)) {
      let name = '';
      if (mongoose.Types.ObjectId.isValid(eventKey)) {
        const ev = await EventModel.findById(eventKey).select('title').lean();
        name = ev?.title || '';
      }
      eventNameCache.set(eventKey, name);
    }

    record.recipientCount = 1; // legacy rows are per-email entries
    record.sentCount = record.status === 'sent' ? 1 : 0;
    record.failedCount = record.status === 'failed' ? 1 : 0;
    record.startedAt = record.startedAt || record.sentAt || new Date();
    record.completedAt = record.completedAt || record.sentAt || new Date();
    if (!record.eventName) {
      record.eventName = eventNameCache.get(eventKey) || '';
    }

    await record.save();
    updated++;
  }

  console.log(`[migrate:sending-history] updated ${updated} record(s). No records were deleted.`);
  await mongoose.connection.close?.();
}

migrate().catch((err) => {
  console.error('[migrate:sending-history] failed:', err);
  process.exitCode = 1;
});
