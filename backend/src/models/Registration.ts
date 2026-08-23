import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistration extends Document {
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  registerNumber: string;
  skills: string;
  githubUrl: string;
  linkedinUrl: string;
  areasOfInterest: string;
  whyJoin: string;
  otpHash: string;
  otpExpiresAt: Date;
  status: 'pending' | 'verified';
}

const registrationSchema = new Schema<IRegistration>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    registerNumber: { type: String, required: true, unique: true },
    skills: { type: String, required: true },
    githubUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    areasOfInterest: { type: String, required: true },
    whyJoin: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const Registration = mongoose.model<IRegistration>('Registration', registrationSchema);
