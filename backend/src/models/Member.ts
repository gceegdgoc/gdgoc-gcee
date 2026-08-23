import mongoose, { Schema, Document } from 'mongoose';
import { isValidHttpUrl } from '../utils/safe';

/**
 * Canonical Member model.
 *
 * A member is a community/team profile. Contact/application details
 * (email, phone, registerNumber, skills, areasOfInterest, whyJoin) are stored
 * alongside team display fields (team, role, photo, socialLinks, order).
 * Only `name` and `email` are hard-required at the database level; the admin
 * controller enforces the richer contract explicitly so legacy seeded members
 * (which predate these fields) remain editable.
 */

export const TEAMS = [
  'Core Team',
  'Student Coordinators',
  'Technical Team',
  'Design Team',
  'Event Team',
  'Community Members',
];

export interface IMember extends Document {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  year?: string;
  registerNumber?: string;
  skills?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  areasOfInterest?: string;
  whyJoin?: string;
  status: 'active' | 'rejected' | 'pending';
  joinedDate?: Date;
  team?: string;
  role?: string;
  coordinatorRole?: string;
  photo?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  order?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Optional URL rule shared by every social field: an EMPTY string is always
 * accepted (the field is optional), but a non-empty value must be a real
 * http(s) URL. Keeps schema-level parity with the controller validation.
 */
const optionalUrl = {
  validator: (v: unknown) => {
    const raw = typeof v === 'string' ? v.trim() : '';
    return !raw || isValidHttpUrl(raw);
  },
  message: (props: { path: string }) => `${props.path} must be a valid http(s) URL (e.g. https://example.com).`,
};

const socialLinksSchema = new Schema(
  {
    github: { type: String, default: '', validate: optionalUrl },
    linkedin: { type: String, default: '', validate: optionalUrl },
    instagram: { type: String, default: '', validate: optionalUrl },
    twitter: { type: String, default: '', validate: optionalUrl },
  },
  { _id: false }
);

const memberSchema = new Schema<IMember>(
  {
    name: { type: String, required: [true, 'Name is required.'], trim: true },
    email: { type: String, required: [true, 'Email is required.'], unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    college: { type: String, default: 'Government College of Engineering, Erode' },
    department: { type: String, default: '' },
    year: { type: String, default: '' },
    registerNumber: { type: String, default: '', trim: true },
    skills: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    areasOfInterest: { type: String, default: '' },
    whyJoin: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'rejected', 'pending'],
      default: 'active',
    },
    joinedDate: { type: Date, default: Date.now },
    // Team display fields used by the public site and admin dashboard.
    team: { type: String, enum: TEAMS, default: 'Community Members' },
    role: { type: String, default: 'Member', trim: true },
    coordinatorRole: { type: String, default: '' },
    photo: { type: String, default: '' },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    order: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Member = mongoose.model<IMember>('Member', memberSchema);
