import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: 'PRESENT' | 'ABSENT' | 'Present' | 'Absent' | string;
  markedAt?: Date;
  markedBy?: any;
  method?: string;
  eventDate?: any;
}

const attendanceSchema = new Schema<IAttendance>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['PRESENT', 'ABSENT', 'Present', 'Absent'], required: true },
  markedAt: { type: Date, default: Date.now },
  markedBy: { type: Schema.Types.Mixed },
  method: { type: String },
}, { timestamps: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
