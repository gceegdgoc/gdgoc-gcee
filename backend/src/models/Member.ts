import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
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
  status: 'active' | 'rejected' | 'pending';
    team: any;
joinedDate: Date;
}

const memberSchema = new Schema<IMember>(
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
    status: {
      type: String,
      enum: ['active', 'rejected', 'pending'],
      default: 'active',
    },
    joinedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Member = mongoose.model<IMember>('Member', memberSchema);
