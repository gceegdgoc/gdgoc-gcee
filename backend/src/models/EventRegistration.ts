import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEventRegistration extends Document {
  studentId?: Types.ObjectId;
  eventId: Types.ObjectId;
  email: string;
  studentName: string;
  phone?: string;
  college?: string;
  department?: string;
  yearOfStudy?: string;
  rollNumber?: string;
  registeredAt?: Date;
  attendanceStatus?: 'registered' | 'attended' | 'absent';
  attendanceMarkedAt?: Date;
  googleFormResponseId?: string;
  status?: string;
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    phone: { type: String, trim: true },
    college: {
      type: String,
      trim: true,
      default: 'Government College of Engineering, Erode',
    },
    department: { type: String, trim: true },
    yearOfStudy: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    registeredAt: { type: Date, default: Date.now },
    attendanceStatus: {
      type: String,
      enum: ['registered', 'attended', 'absent'],
      default: 'registered',
    },
    attendanceMarkedAt: { type: Date },
    googleFormResponseId: { type: String },
    status: { type: String, default: 'registered' },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate registrations for the same student email and event
eventRegistrationSchema.index({ eventId: 1, email: 1 }, { unique: true });
eventRegistrationSchema.index({ eventId: 1, attendanceStatus: 1 });

export const EventRegistration = mongoose.model<IEventRegistration>(
  'EventRegistration',
  eventRegistrationSchema
);

