import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Canonical Event model.
 *
 * This is the ONLY Event schema in the system. It mirrors the exact field set
 * used by the admin dashboard, public pages, serializers and the seed script:
 * category/banner/status-style events with an optional legacy-compatible
 * slug/poster/eventType surface so older documents keep working.
 */

export const EVENT_CATEGORIES = [
  'Workshop',
  'Hackathon',
  'Technical Talk',
  'Seminar',
  'Coding Session',
  'Hands-on Session',
  'Project Showcase',
  'Community Meetup',
  'Other',
] as const;

export const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;

export interface IEvent extends Document {
  eventId: string;
  title: string;
  slug: string;
  date: any;
  time?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  description?: string;
  shortDescription?: string;
  banner?: string;
  poster?: string;
  category: string;
  eventType?: string;
  speaker?: string;
  speakerBio?: string;
  speakers?: string[];
  agenda?: string;
  technologies?: string[];
  registrationEnabled: boolean;
  registrationStatus?: 'open' | 'closed';
  isPublished?: boolean;
  registrationDeadline?: string;
  googleFormUrl?: string;
  registrationUrl?: string;
  registrationLink?: string;
  manualRegistrationCount?: number;
  isCertificateEligible: boolean;
  isInauguration?: boolean;
  status: (typeof EVENT_STATUSES)[number];
  emailSent?: boolean;
  emailSentAt?: Date;
  emailSentCount?: number;
  emailFailedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function generateSlug(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

const eventSchema = new Schema<IEvent>(
  {
    eventId: { type: String, default: '', index: true },
    title: { type: String, required: [true, 'Title is required.'], trim: true },
    slug: { type: String, index: { unique: true, sparse: true }, trim: true },
    date: { type: Date, required: [true, 'Date is required.'] },
    time: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    venue: { type: String, default: '' },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    banner: { type: String, default: '' },
    poster: { type: String, default: '' },
    // Free-form string (not enum) so legacy documents with older category
    // labels stay editable; new values are validated in the controller.
    category: { type: String, default: 'Other', trim: true },
    eventType: { type: String, default: '' },
    speaker: { type: String, default: '' },
    speakerBio: { type: String, default: '' },
    speakers: [{ type: String }],
    agenda: { type: String, default: '' },
    technologies: [{ type: String }],
    registrationEnabled: { type: Boolean, default: true },
    registrationStatus: { type: String, enum: ['open', 'closed'], default: 'open' },
    isPublished: { type: Boolean, default: true },
    registrationDeadline: { type: String, default: '' },
    // Legacy documents may still contain a `capacity` field; it is intentionally
    // NOT part of the schema so the application ignores registration limits.
    googleFormUrl: { type: String, default: '' },
    registrationUrl: { type: String, default: '' },
    registrationLink: { type: String, default: '' },
    manualRegistrationCount: { type: Number, default: 0, min: 0 },
    isCertificateEligible: { type: Boolean, default: false },
    isInauguration: { type: Boolean, default: false },
    status: { type: String, enum: [...EVENT_STATUSES], default: 'UPCOMING' },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailSentCount: { type: Number, default: 0 },
    emailFailedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Preserve legacy fields that may exist on old documents.
    strict: true,
  }
);

// Never allow an undefined slug: auto-generate from the title before validation.
eventSchema.pre('validate', async function ensureSlug(next) {
  try {
    if (!this.slug && this.title) {
      const base = generateSlug(this.title) || 'event';
      let candidate = base;
      // Guarantee uniqueness without relying on a hard failure.
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await (this.constructor as Model<IEvent>).countDocuments({ slug: candidate }).exec();
        if (clash === 0) break;
        candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      this.slug = candidate;
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

// Mirror poster/banner in both directions so old and new clients stay compatible.
eventSchema.pre('validate', function mirrorPosterBanner(next) {
  if (!this.banner && this.poster) this.banner = this.poster;
  if (!this.poster && this.banner) this.poster = this.banner;
  if (!this.eventType && this.category) this.eventType = this.category;
  next();
});

export const Event = mongoose.model<IEvent>('Event', eventSchema);
