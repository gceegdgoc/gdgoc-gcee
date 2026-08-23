import mongoose, { Schema, Document } from 'mongoose';

export const RESOURCE_CATEGORIES = ['Web', 'App', 'AI', 'Cloud', 'Design', 'Other'];

export interface IResource extends Document {
  title: string;
  category: string;
    url?: string;
  uploadedBy?: any;
  createdAt?: Date;
link: string;
  description?: string;
}

const resourceSchema = new Schema<IResource>({
  title: { type: String, required: true },
  category: { type: String, enum: RESOURCE_CATEGORIES, required: true },
  link: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
