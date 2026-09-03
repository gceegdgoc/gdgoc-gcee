import mongoose, { Schema, Document } from 'mongoose';

/** Single source of truth for resource categories — shared with the frontend dropdown. */
export const RESOURCE_CATEGORIES = [
  'Web Development',
  'AI/ML',
  'Cloud',
  'Git & GitHub',
  'Android',
  'Cybersecurity',
  'Open Source',
  'Programming',
  'Other',
];

export interface IResource extends Document {
  title: string;
  description?: string;
  link: string;
  /** Legacy field kept for backward compatibility with older documents. */
  url?: string;
  category: string;
  type?: string;
  uploadedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: [true, 'Title is required.'], trim: true },
    description: { type: String, default: '' },
    // `link` is the canonical URL field. `url` remains as a legacy alias.
    link: { type: String, required: [true, 'Link is required.'], trim: true },
    url: { type: String, default: '' },
    category: { type: String, enum: RESOURCE_CATEGORIES, default: 'Other' },
    type: { type: String, default: 'link' },
    uploadedBy: { type: String, default: 'GCEE Tech Hub' },
  },
  { timestamps: true }
);

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
