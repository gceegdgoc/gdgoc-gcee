const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'src', 'models');

// 1. Update Event.ts
const eventPath = path.join(modelsDir, 'Event.ts');
let eventContent = fs.readFileSync(eventPath, 'utf8');
eventContent = eventContent.replace(
  'isPublished: boolean;',
  `isPublished: boolean;
  category?: string;
  capacity?: number;
  registrationEnabled?: boolean;
  googleFormUrl?: string;
  responseSheetId?: string;
  lastSyncedAt?: Date;
  status?: string;
  manualRegistrationCount?: number;
  eventId?: string;`
);
eventContent = eventContent.replace(
  'isPublished: { type: Boolean, default: false },',
  `isPublished: { type: Boolean, default: false },
    category: { type: String },
    capacity: { type: Number },
    registrationEnabled: { type: Boolean, default: true },
    googleFormUrl: { type: String },
    responseSheetId: { type: String },
    lastSyncedAt: { type: Date },
    status: { type: String },
    manualRegistrationCount: { type: Number, default: 0 },
    eventId: { type: String },`
);
fs.writeFileSync(eventPath, eventContent);

// 2. Update GoogleFormRegistration.ts
const gfrPath = path.join(modelsDir, 'GoogleFormRegistration.ts');
const gfrContent = `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGoogleFormRegistration extends Document {
  eventId: Types.ObjectId;
  email: string;
  name: string;
  phone?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  college?: string;
  source?: string;
  isRead?: boolean;
  submittedAt?: Date;
  createdAt?: Date;
  responses: Record<string, any>;
  registeredAt: Date;
}

const googleFormRegistrationSchema = new Schema<IGoogleFormRegistration>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  rollNumber: { type: String },
  department: { type: String },
  year: { type: String },
  college: { type: String },
  source: { type: String },
  isRead: { type: Boolean, default: false },
  submittedAt: { type: Date },
  responses: { type: Schema.Types.Mixed },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const GoogleFormRegistration = mongoose.model<IGoogleFormRegistration>('GoogleFormRegistration', googleFormRegistrationSchema);
`;
fs.writeFileSync(gfrPath, gfrContent);

// 3. Update GalleryItem.ts
const giPath = path.join(modelsDir, 'GalleryItem.ts');
const giContent = `import mongoose, { Schema, Document, Types } from 'mongoose';

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
`;
fs.writeFileSync(giPath, giContent);

// 4. Update Member.ts
const memberPath = path.join(modelsDir, 'Member.ts');
let memberContent = fs.readFileSync(memberPath, 'utf8');
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

// 5. Update Admin.ts
const adminPath = path.join(modelsDir, 'Admin.ts');
let adminContent = fs.readFileSync(adminPath, 'utf8');
if (!adminContent.includes('isActive')) {
    adminContent = adminContent.replace(
      'role: string;',
      `role: string;
  isActive: boolean;`
    );
    adminContent = adminContent.replace(
      'role: { type: String, enum: [\'superadmin\', \'admin\'], default: \'admin\' },',
      `role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    isActive: { type: Boolean, default: true },`
    );
    fs.writeFileSync(adminPath, adminContent);
}

// 6. Update CertificateCampaign.ts
const ccPath = path.join(modelsDir, 'CertificateCampaign.ts');
const ccContent = `import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificateCampaign extends Document {
  eventId: Types.ObjectId;
  name?: string;
  status: string;
  sentCount: number;
  createdAt: Date;
}

const certificateCampaignSchema = new Schema<ICertificateCampaign>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String },
  status: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const CertificateCampaign = mongoose.model<ICertificateCampaign>('CertificateCampaign', certificateCampaignSchema);
`;
fs.writeFileSync(ccPath, ccContent);
