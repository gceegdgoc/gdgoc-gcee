import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEventRegistration extends Document {
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  registeredAt?: Date;
  status?: string;
}

const eventRegistrationSchema = new Schema<IEventRegistration>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, default: 'registered' },
}, { timestamps: true });

export const EventRegistration = mongoose.model<IEventRegistration>('EventRegistration', eventRegistrationSchema);
