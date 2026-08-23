import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  slug: string;
  date: Date;
  time: string;
  venue: string;
  description: string;
  shortDescription: string;
  poster: string;
  eventType: string;
  speakers: string[];
  agenda: string;
  registrationUrl: string;
  registrationStatus: 'open' | 'closed';
  isPublished: boolean;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    poster: { type: String, required: true },
    eventType: { type: String, required: true },
    speakers: [{ type: String }],
    agenda: { type: String, default: '' },
    registrationUrl: { type: String, default: '' },
    registrationStatus: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>('Event', eventSchema);
