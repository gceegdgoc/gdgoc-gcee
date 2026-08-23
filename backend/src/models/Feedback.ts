import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  eventId: Types.ObjectId;
  studentId?: Types.ObjectId;
  rating: number;
  comment?: string;
  name?: string;
  createdAt?: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  rating: { type: Number, required: true },
  comment: { type: String },
  name: { type: String },
}, { timestamps: true });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
