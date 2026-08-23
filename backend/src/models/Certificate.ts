import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  certificateId: string;
  studentId?: Types.ObjectId;
  eventId: Types.ObjectId;
  eventRegistrationId?: Types.ObjectId;
    pdfBuffer?: any;
  studentName?: string;
  eventName?: string;
  eventDate?: any;
  issueDate?: any;
  qrCode?: string;
  verificationUrl?: string;
campaignId?: any;
  studentEmail?: any;
  status?: any;
  revokedAt?: any;
  revokedBy?: any;
  revokeReason?: any;
  certificateUrl?: string;
  issuedAt?: Date;
  verificationStatus?: string;
}

const certificateSchema = new Schema<ICertificate>({
  certificateId: { type: String, required: true, unique: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' }, // Optional for quick-gen
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'A real event must be linked to the certificate.'],
  },
  eventRegistrationId: { type: Schema.Types.ObjectId, ref: 'EventRegistration' },
  certificateUrl: { type: String },
  issuedAt: { type: Date, default: Date.now },
  verificationStatus: { type: String },
}, { timestamps: true });

export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);
