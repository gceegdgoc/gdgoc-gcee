import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  year?: string;
  rollNumber?: string;
  profileImage?: string;
  isVerified: boolean;
  points?: number;
  bio?: string;
  socialLinks?: Record<string, string>;
  joinedAt?: Date;
  passwordHash: string;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  otpLastSentAt?: Date;
  isActive: boolean;
  createdAt?: Date;
}

const studentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  college: { type: String },
  department: { type: String },
  year: { type: String },
  rollNumber: { type: String },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  bio: { type: String },
  socialLinks: { type: Map, of: String },
  joinedAt: { type: Date, default: Date.now },
  passwordHash: { type: String, required: true },
  otp: { type: String },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
