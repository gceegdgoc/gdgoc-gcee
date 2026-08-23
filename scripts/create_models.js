const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'src', 'models');
if (!fs.existsSync(modelsDir)) {
  console.log("Not found modelsDir: " + modelsDir);
}

const templates = {
  'Student.ts': `import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  year?: string;
  rollNumber?: string;
  profileImage?: string;
  isVerified: boolean;
  points?: number;
  bio?: string;
  socialLinks?: Record<string, string>;
  joinedAt?: Date;
  passwordHash: string;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  otpLastSentAt?: Date;
  isActive: boolean;
}

const studentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  college: { type: String },
  department: { type: String },
  year: { type: String },
  rollNumber: { type: String },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  bio: { type: String },
  socialLinks: { type: Map, of: String },
  joinedAt: { type: Date, default: Date.now },
  passwordHash: { type: String, required: true },
  otp: { type: String },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
`,
  'Attendance.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: 'Present' | 'Absent';
  markedAt?: Date;
  markedBy?: Types.ObjectId;
}

const attendanceSchema = new Schema<IAttendance>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  markedAt: { type: Date, default: Date.now },
  markedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
`,
  'Certificate.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  certificateId: string;
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  certificateUrl?: string;
  issuedAt?: Date;
  verificationStatus?: string;
}

const certificateSchema = new Schema<ICertificate>({
  certificateId: { type: String, required: true, unique: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  certificateUrl: { type: String },
  issuedAt: { type: Date, default: Date.now },
  verificationStatus: { type: String },
}, { timestamps: true });

export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);
`,
  'EventRegistration.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

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
`,
  'ContactMessage.ts': `import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt?: Date;
}

const contactMessageSchema = new Schema<IContactMessage>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const ContactMessage = mongoose.model<IContactMessage>('ContactMessage', contactMessageSchema);
`,
  'GalleryItem.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGalleryItem extends Document {
  title: string;
  imageUrl: string;
  eventId?: Types.ObjectId;
  description?: string;
}

const galleryItemSchema = new Schema<IGalleryItem>({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  description: { type: String },
}, { timestamps: true });

export const GalleryItem = mongoose.model<IGalleryItem>('GalleryItem', galleryItemSchema);
`,
  'Feedback.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  eventId: Types.ObjectId;
  studentId?: Types.ObjectId;
  rating: number;
  comment?: string;
}

const feedbackSchema = new Schema<IFeedback>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  rating: { type: Number, required: true },
  comment: { type: String },
}, { timestamps: true });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
`,
  'Resource.ts': `import mongoose, { Schema, Document } from 'mongoose';

export const RESOURCE_CATEGORIES = ['Web', 'App', 'AI', 'Cloud', 'Design', 'Other'];

export interface IResource extends Document {
  title: string;
  category: string;
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
`,
  'GoogleFormRegistration.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGoogleFormRegistration extends Document {
  eventId: Types.ObjectId;
  email: string;
  name: string;
  responses: Record<string, any>;
  registeredAt: Date;
}

const googleFormRegistrationSchema = new Schema<IGoogleFormRegistration>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  responses: { type: Schema.Types.Mixed },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const GoogleFormRegistration = mongoose.model<IGoogleFormRegistration>('GoogleFormRegistration', googleFormRegistrationSchema);
`,
  'SendingHistory.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISendingHistory extends Document {
  eventId: Types.ObjectId;
  sentAt: Date;
  status: string;
  recipientCount: number;
}

const sendingHistorySchema = new Schema<ISendingHistory>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, required: true },
  recipientCount: { type: Number, required: true },
}, { timestamps: true });

export const SendingHistory = mongoose.model<ISendingHistory>('SendingHistory', sendingHistorySchema);
`,
  'EmailLog.ts': `import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  status: string;
  sentAt: Date;
  error?: string;
}

const emailLogSchema = new Schema<IEmailLog>({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  error: { type: String },
}, { timestamps: true });

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
`,
  'CertificateCampaign.ts': `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificateCampaign extends Document {
  eventId: Types.ObjectId;
  status: string;
  sentCount: number;
  createdAt: Date;
}

const certificateCampaignSchema = new Schema<ICertificateCampaign>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const CertificateCampaign = mongoose.model<ICertificateCampaign>('CertificateCampaign', certificateCampaignSchema);
`,
  'CoordinatorRole.ts': `import mongoose, { Schema, Document } from 'mongoose';

export interface ICoordinatorRole extends Document {
  title: string;
  description?: string;
}

const coordinatorRoleSchema = new Schema<ICoordinatorRole>({
  title: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export const CoordinatorRole = mongoose.model<ICoordinatorRole>('CoordinatorRole', coordinatorRoleSchema);
`,
  'BulkEmailLog.ts': `import mongoose, { Schema, Document } from 'mongoose';

export interface IBulkEmailLog extends Document {
  subject: string;
  body: string;
  status: string;
  sentCount: number;
  createdAt: Date;
}

const bulkEmailLogSchema = new Schema<IBulkEmailLog>({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const BulkEmailLog = mongoose.model<IBulkEmailLog>('BulkEmailLog', bulkEmailLogSchema);
`
};

for (const [filename, content] of Object.entries(templates)) {
  fs.writeFileSync(path.join(modelsDir, filename), content);
  console.log('Created', filename);
}

// Update index.ts
const indexContent = [
  "export * from './Admin';",
  "export { Event as EventModel, IEvent } from './Event';",
  "export * from './Member';",
  "export * from './Registration';",
  ...Object.keys(templates).map(name => `export * from './${name.replace('.ts', '')}';`),
  "export const TEAMS = ['Technical', 'Design', 'Management', 'Content'];"
].join('\n') + '\n';

fs.writeFileSync(path.join(modelsDir, 'index.ts'), indexContent);
console.log('Updated index.ts');
