import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * SendingHistory
 *
 * Two record shapes share this collection:
 *
 * 1. `recordType: 'recipient'` (default) — one row per individual email
 *    attempt. `recipientCount` stores the TOTAL number of recipients in the
 *    batch the email belonged to (computed BEFORE sending starts — see the
 *    admin event-email / distribution controllers). Legacy documents created
 *    before batch tracking may be missing newer fields; API responses treat
 *    those fields as optional and scripts/migrate-sending-history.ts
 *    backfills them safely.
 *
 * 2. `recordType: 'batch'` — reserved for bulk "send to N students"
 *    operations, carrying recipientCount / sentCount / failedCount /
 *    startedAt / completedAt for progress tracking and auditing.
 *
 * `recipientCount` is REQUIRED on both shapes: never create a document
 * without it.
 */

export type SendingHistoryRecordType = 'batch' | 'recipient';
export type SendingBatchStatus = 'sending' | 'completed' | 'partial' | 'failed';

export interface ISendingHistory extends Document {
  eventId: Types.ObjectId;
  sentAt: Date;
  status: string;
  recordType?: SendingHistoryRecordType;
  batchId?: string;
  eventType?: string;
  eventName?: string;
  subject?: string;
  recipientEmail?: string;
  recipientName?: string;
  errorMessage?: string;
  resendId?: string;
  /** Total intended recipients for the operation (required). */
  recipientCount: number;
  /** Batch-only counters. */
  sentCount?: number;
  successCount?: number;
  failedCount?: number;
  startedAt?: Date;
  completedAt?: Date;
}

const sendingHistorySchema = new Schema<ISendingHistory>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, required: true },
  recordType: {
    type: String,
    enum: ['batch', 'recipient'],
    default: 'recipient',
  },
  batchId: { type: String, index: true },
  eventType: { type: String },
  eventName: { type: String },
  subject: { type: String },
  recipientEmail: { type: String },
  recipientName: { type: String },
  errorMessage: { type: String },
  resendId: { type: String },
  recipientCount: {
    type: Number,
    required: [true, "SendingHistory validation failed: recipientCount: Path 'recipientCount' is required."],
    min: 0,
  },
  sentCount: { type: Number, default: 0, min: 0 },
  successCount: { type: Number, default: 0, min: 0 },
  failedCount: { type: Number, default: 0, min: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

/** Batch rows are queried often (progress polling) — keep them indexed. */
sendingHistorySchema.index({ eventId: 1, recordType: 1, createdAt: -1 });
sendingHistorySchema.index({ eventId: 1, eventType: 1, status: 1 });

export const SendingHistory = mongoose.model<ISendingHistory>('SendingHistory', sendingHistorySchema);
