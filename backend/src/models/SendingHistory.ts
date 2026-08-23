import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISendingHistory extends Document {
  eventId: Types.ObjectId;
  sentAt: Date;
  status: string;
  eventType?: string;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  errorMessage?: string;
  recipientCount: number;
}

const sendingHistorySchema = new Schema<ISendingHistory>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, required: true },
  eventType: { type: String },
  recipientEmail: { type: String },
  recipientName: { type: String },
  subject: { type: String },
  errorMessage: { type: String },
  recipientCount: { type: Number, required: true },
}, { timestamps: true });

export const SendingHistory = mongoose.model<ISendingHistory>('SendingHistory', sendingHistorySchema);
