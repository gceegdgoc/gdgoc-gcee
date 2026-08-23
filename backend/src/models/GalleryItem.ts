import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGalleryItem extends Document {
  title: string;
  imageUrl: string;
  image?: string;
  category?: string;
  eventId?: Types.ObjectId;
  description?: string;
  createdAt?: Date;
}

const galleryItemSchema = new Schema<IGalleryItem>({
  title: { type: String, required: true },
  imageUrl: { type: String },
  image: { type: String },
  category: { type: String },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  description: { type: String },
}, { timestamps: true });

export const GalleryItem = mongoose.model<IGalleryItem>('GalleryItem', galleryItemSchema);
