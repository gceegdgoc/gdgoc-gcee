import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGoogleFormRegistration extends Document {
  eventId: Types.ObjectId;
  email: string;
  name: string;
  phone?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  college?: string;
  source?: string;
  isRead?: boolean;
  submittedAt?: Date;
  createdAt?: Date;
    responseId?: any;
responses: Record<string, any>;
  registeredAt: Date;
}

const googleFormRegistrationSchema = new Schema<IGoogleFormRegistration>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  rollNumber: { type: String },
  department: { type: String },
  year: { type: String },
  college: { type: String },
  source: { type: String },
  isRead: { type: Boolean, default: false },
  submittedAt: { type: Date },
  responses: { type: Schema.Types.Mixed },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const GoogleFormRegistration = mongoose.model<IGoogleFormRegistration>('GoogleFormRegistration', googleFormRegistrationSchema);
