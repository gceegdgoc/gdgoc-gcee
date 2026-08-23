const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'src', 'models');

// Overwrite Registration.ts to be Event Registration
const regPath = path.join(modelsDir, 'Registration.ts');
const regContent = `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegistration extends Document {
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  registeredAt?: Date;
  status?: string;
  source?: string;
}

const registrationSchema = new Schema<IRegistration>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, default: 'registered' },
  source: { type: String },
}, { timestamps: true });

export const Registration = mongoose.model<IRegistration>('Registration', registrationSchema);
`;
fs.writeFileSync(regPath, regContent);

// Fix Event.ts
const eventPath = path.join(modelsDir, 'Event.ts');
let eventContent = fs.readFileSync(eventPath, 'utf8');
if (!eventContent.includes('registrationLink')) {
  eventContent = eventContent.replace(
    'isPublished: boolean;',
    `isPublished: boolean;
  registrationLink?: string;
  startTime?: string;
  endTime?: string;
  banner?: string;
  emailSent?: boolean;
  emailSentAt?: Date;
  emailSentCount?: number;
  emailFailedCount?: number;`
  );
  eventContent = eventContent.replace(
    'isPublished: { type: Boolean, default: false },',
    `isPublished: { type: Boolean, default: false },
    registrationLink: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    banner: { type: String },
    emailSent: { type: Boolean },
    emailSentAt: { type: Date },
    emailSentCount: { type: Number },
    emailFailedCount: { type: Number },`
  );
  fs.writeFileSync(eventPath, eventContent);
}

// Fix SendingHistory.ts
const shPath = path.join(modelsDir, 'SendingHistory.ts');
let shContent = fs.readFileSync(shPath, 'utf8');
if (!shContent.includes('eventType')) {
  shContent = shContent.replace(
    'status: string;',
    `status: string;
  eventType?: string;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  errorMessage?: string;`
  );
  shContent = shContent.replace(
    'status: { type: String, required: true },',
    `status: { type: String, required: true },
  eventType: { type: String },
  recipientEmail: { type: String },
  recipientName: { type: String },
  subject: { type: String },
  errorMessage: { type: String },`
  );
  fs.writeFileSync(shPath, shContent);
}

// Fix Student.ts
const studentPath = path.join(modelsDir, 'Student.ts');
let studentContent = fs.readFileSync(studentPath, 'utf8');
if (!studentContent.includes('createdAt?: Date;')) {
  studentContent = studentContent.replace(
    'isActive: boolean;',
    `isActive: boolean;
  createdAt?: Date;`
  );
  fs.writeFileSync(studentPath, studentContent);
}

// Fix Feedback.ts
const fbPath = path.join(modelsDir, 'Feedback.ts');
let fbContent = fs.readFileSync(fbPath, 'utf8');
if (!fbContent.includes('name?: string;')) {
  fbContent = fbContent.replace(
    'comment?: string;',
    `comment?: string;
  name?: string;
  createdAt?: Date;`
  );
  fbContent = fbContent.replace(
    'comment: { type: String },',
    `comment: { type: String },
  name: { type: String },`
  );
  fs.writeFileSync(fbPath, fbContent);
}

// Fix Attendance.ts
const attPath = path.join(modelsDir, 'Attendance.ts');
let attContent = fs.readFileSync(attPath, 'utf8');
if (!attContent.includes('method?: string;')) {
  attContent = attContent.replace(
    'markedBy?: Types.ObjectId;',
    `markedBy?: Types.ObjectId;
  method?: string;`
  );
  attContent = attContent.replace(
    'markedBy: { type: Schema.Types.ObjectId, ref: \'Admin\' },',
    `markedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  method: { type: String },`
  );
  fs.writeFileSync(attPath, attContent);
}

// Fix Member.ts
const memberPath = path.join(modelsDir, 'Member.ts');
let memberContent = fs.readFileSync(memberPath, 'utf8');
if (!memberContent.includes('team?: string;')) {
  memberContent = memberContent.replace(
    'isAlumni: boolean;',
    `isAlumni: boolean;
  team?: string;`
  );
  memberContent = memberContent.replace(
    'isAlumni: { type: Boolean, default: false },',
    `isAlumni: { type: Boolean, default: false },
    team: { type: String },`
  );
  fs.writeFileSync(memberPath, memberContent);
}

console.log("Updated Registration, Event, SendingHistory, Student, Feedback, Attendance, Member.");
