import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  status: string;
  sentAt: Date;
  error?: string;
}

const emailLogSchema = new Schema<IEmailLog>({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  error: { type: String },
}, { timestamps: true });

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
