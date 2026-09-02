export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  year?: string;
  rollNumber?: string;
  profileImage?: string;
  isVerified?: boolean;
  points?: number;
  bio?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  joinedAt?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface GEvent {
  _id: string;
  eventId: string;
  title: string;
  slug?: string;
  description: string;
  shortDescription: string;
  banner: string;
  poster?: string;
  date: string;
  time?: string;
  venue: string;
  speaker: string;
  speakerBio: string;
  category: string;
  technologies: string[];
  registrationEnabled: boolean;
  isRegistrationOpen?: boolean;
  registrationDeadline: string;
  googleFormUrl: string;
  registrationLink?: string;
  responseSheetId?: string;
  responseSheetName?: string;
  lastSyncedAt?: string;
  manualRegistrationCount: number;
  isInauguration: boolean;
  emailSent?: boolean;
  emailSentAt?: string | null;
  emailSentCount?: number;
  emailFailedCount?: number;
  status: EventStatus;
  effectiveStatus: EventStatus;
  registeredCount: number;
  createdAt?: string;
}

export interface SendingHistoryEntry {
  _id: string;
  eventType: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt?: string;
}

export interface SendingHistoryStats {
  sent: number;
  failed: number;
  pending: number;
}

/** One row of GET /api/admin/events/:eventId/sending-history */
export interface SendingHistoryRow extends SendingHistoryEntry {
  eventName?: string | null;
  /** Legacy rows may predate these fields — null when missing. */
  recipientCount?: number | null;
  sentCount?: number | null;
  failedCount?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

/** GET /api/admin/events/:eventId/sending-history response */
export interface SendingHistoryResponse {
  success: boolean;
  history: SendingHistoryRow[];
  total: number;
  page: number;
  totalPages: number;
  stats: SendingHistoryStats;
}

/** GET /api/admin/events/:eventId/verified-count response */
export interface VerifiedStudentCountResponse {
  success: boolean;
  count: number;
}

/** POST /api/admin/events/:eventId/send-to-all response */
export interface SendEventToAllResponse {
  success: boolean;
  message?: string;
  alreadySent?: boolean;
  /** Exact eligible-recipient count resolved before the batch started. */
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  totalRecipients?: number;
  status?: 'Success' | 'Partial' | 'Failure';
  failedEmails?: string[];
  startedAt?: string;
  completedAt?: string;
  emailSentAt?: string | null;
  emailSentCount?: number;
}

export interface AttendanceRecord {
  id: string;
  eventId?: string;
  eventTitle?: string;
  eventDate: string;
  status: 'PRESENT' | 'ABSENT';
  method: 'ADMIN' | 'QR';
  markedAt?: string;
}

export interface EventParticipant {
  registrationId: string;
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  college: string;
  registered: boolean;
  participation: 'PARTICIPATED' | 'NOT_PARTICIPATED';
}

export interface Member {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  college?: string;
  registerNumber?: string;
  skills?: string;
  areasOfInterest?: string;
  whyJoin?: string;
  team: string;
  role: string;
  coordinatorRole: string;
  department: string;
  year: string;
  photo: string;
  order?: number;
  isActive?: boolean;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
}

/** POST/PUT /api/admin/members request body (social URLs are optional). */
export interface MemberPayload {
  name: string;
  email: string;
  phone: string;
  college: string;
  registerNumber: string;
  skills: string;
  areasOfInterest: string;
  whyJoin: string;
  team: string;
  role: string;
  department: string;
  year: string;
  photo: string;
  socialLinks: {
    github: string;
    linkedin: string;
    instagram: string;
    twitter: string;
  };
}

/** POST/PUT /api/admin/members response */
export interface MemberSaveResponse {
  success: boolean;
  message: string;
  member: Member;
}



/** Row of GET /api/admin/events/:eventId/registrations */
export interface EventRegistrationRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: string;
  college?: string;
  registeredAt?: string;
  source: 'form' | 'direct' | 'manual' | (string & {});
}

export interface CoordinatorRole {
  _id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  createdAt?: string;
}

export interface ResourceItem {
  _id: string;
  title: string;
  description: string;
  /** Canonical URL field (legacy `url` kept for compatibility). */
  link?: string;
  url?: string;
  category: string;
  type?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface EligibilityStudent {
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  attended: number;
  attendancePercentage: number;
  qualifies: boolean;
}

export interface DashboardStats {
  registered: number;
  attended: number;
  attendancePercent: number;
}

export interface AdminStats {
  totalStudents: number;
  verifiedStudents?: number;
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  attendanceRecords: number;
  members: number;
  eventsEmailSent?: number;
  totalResources?: number;
}
