import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificateCampaign extends Document {
  eventId: Types.ObjectId;
  name?: string;
  status: string;
  sentCount: number;
  minimumAttendancePercentage?: any;
  minimumEligibleEvents?: any;
  generatedAt?: any;
  createdAt: Date;
}

const certificateCampaignSchema = new Schema<ICertificateCampaign>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String },
  status: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const CertificateCampaign = mongoose.model<ICertificateCampaign>('CertificateCampaign', certificateCampaignSchema);
