import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  certificateId: string;
  studentId?: Types.ObjectId;
  eventId: Types.ObjectId;
  eventRegistrationId?: Types.ObjectId;
  campaignId?: Types.ObjectId;
  studentName?: string;
  studentEmail?: string;
  organization?: string;
  institution?: string;
  eventName?: string;
  /** Canonical YYYY-MM-DD */
  eventDate?: string;
  /** Canonical YYYY-MM-DD */
  issueDate?: string;
  participationStatus?: string;
  issuedBy?: string;
  qrCode?: string;
  verificationUrl?: string;
  pdfBuffer?: Buffer;
  status: 'VALID' | 'REVOKED';
  revokedAt?: Date | null;
  revokedBy?: string;
  revokeReason?: string;
  certificateUrl?: string;
  issuedAt?: Date;
  verificationStatus?: string;
  sentAt?: Date;
}

// NOTE: every field here is written by at least one controller
// (certificate / eventCertificate / campaign). Mongoose strict mode drops
// any key NOT declared below, which previously hollowed out certificates
// (no name/date/PDF) while still returning 201 — keep this list in sync.
const certificateSchema = new Schema<ICertificate>({
  certificateId: { type: String, required: true, unique: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' }, // Optional for quick-gen
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'A real event must be linked to the certificate.'],
  },
  eventRegistrationId: { type: Schema.Types.ObjectId, ref: 'EventRegistration' },
  campaignId: { type: Schema.Types.ObjectId, ref: 'CertificateCampaign' },
  studentName: { type: String, trim: true },
  studentEmail: { type: String, trim: true, lowercase: true },
  organization: { type: String },
  institution: { type: String },
  eventName: { type: String, trim: true },
  eventDate: { type: String },
  issueDate: { type: String },
  participationStatus: { type: String },
  issuedBy: { type: String },
  qrCode: { type: String },
  verificationUrl: { type: String },
  pdfBuffer: { type: Buffer },
  status: { type: String, enum: ['VALID', 'REVOKED'], default: 'VALID' },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: String },
  revokeReason: { type: String },
  certificateUrl: { type: String },
  issuedAt: { type: Date, default: Date.now },
  verificationStatus: { type: String },
  sentAt: { type: Date },
}, { timestamps: true });

export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);
