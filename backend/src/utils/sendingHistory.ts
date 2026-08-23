import { SendingHistory, type ISendingHistory } from '../models/SendingHistory';

/**
 * Centralized helpers for writing SendingHistory documents.
 *
 * Invariants enforced here (single source of truth):
 *  - `recipientCount` is ALWAYS supplied on every create — batch rows carry
 *    the exact number of eligible recipients computed BEFORE sending starts,
 *    per-recipient rows carry the same batch total.
 *  - History writes must never break the email flow: failures to persist
 *    history are logged server-side and swallowed.
 */

export interface BatchHistoryInput {
  eventId: string;
  eventName?: string;
  eventType?: string;
  subject?: string;
  /** Exact number of recipients, computed BEFORE any email is sent. */
  recipientCount: number;
}

/** Create the batch summary row at the START of a bulk send. Never throws. */
export async function createBatchHistory(input: BatchHistoryInput): Promise<ISendingHistory | null> {
  const count = Number(input.recipientCount);
  if (!Number.isFinite(count) || count < 0) {
    // Programming error guard: never persist an invalid record.
    console.error('[sendingHistory] createBatchHistory called with invalid recipientCount:', input.recipientCount);
    return null;
  }
  try {
    return await SendingHistory.create({
      eventId: input.eventId,
      recordType: 'batch',
      eventType: input.eventType || 'event-email',
      eventName: input.eventName || '',
      subject: input.subject || '',
      status: 'sending',
      recipientCount: count,
      sentCount: 0,
      failedCount: 0,
      startedAt: new Date(),
      sentAt: new Date(),
    });
  } catch (err: any) {
    console.error('[sendingHistory] failed to create batch record:', err?.message);
    return null;
  }
}

export interface RecipientHistoryInput {
  /** Batch total — required so per-recipient rows always carry it too. */
  recipientCount: number;
  eventType?: string;
  subject?: string;
  recipientEmail: string;
  recipientName?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  resendId?: string;
}

/** Persist one per-recipient audit row. Never throws. */
export async function logRecipientEmail(input: RecipientHistoryInput): Promise<void> {
  try {
    await SendingHistory.create({
      recordType: 'recipient',
      eventType: input.eventType || 'event-email',
      subject: input.subject || '',
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName || input.recipientEmail.split('@')[0],
      status: input.status,
      errorMessage: input.errorMessage,
      resendId: input.resendId,
      recipientCount: Math.max(0, Math.floor(Number(input.recipientCount) || 0)),
      sentAt: new Date(),
    });
  } catch (err: any) {
    console.error('[sendingHistory] failed to persist recipient record:', err?.message);
  }
}

/**
 * Finalize a batch row with the real sent/failed counters.
 * status: all sent → 'completed', some failed → 'partial', none delivered → 'failed'.
 * Never throws.
 */
export async function completeBatchHistory(
  batchDoc: ISendingHistory | null,
  result: { sentCount: number; failedCount: number }
): Promise<void> {
  if (!batchDoc) return;
  const sent = Math.max(0, Math.floor(result.sentCount) || 0);
  const failed = Math.max(0, Math.floor(result.failedCount) || 0);
  const status = failed === 0 && sent > 0 ? 'completed' : sent === 0 ? 'failed' : 'partial';
  try {
    batchDoc.set({
      status,
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    });
    await batchDoc.save();
  } catch (err: any) {
    console.error('[sendingHistory] failed to finalize batch record:', err?.message);
  }
}
