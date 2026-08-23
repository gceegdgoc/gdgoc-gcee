import mongoose, { Schema, Document } from 'mongoose';

export interface IBulkEmailLog extends Document {
  subject: string;
  body: string;
  status: string;
  sentCount: number;
  createdAt: Date;
}

const bulkEmailLogSchema = new Schema<IBulkEmailLog>({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const BulkEmailLog = mongoose.model<IBulkEmailLog>('BulkEmailLog', bulkEmailLogSchema);
