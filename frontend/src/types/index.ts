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
  description: string;
  shortDescription: string;
  banner: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  speaker: string;
  speakerBio: string;
  category: string;
  technologies: string[];
  registrationEnabled: boolean;
  isRegistrationOpen?: boolean;
  registrationDeadline: string;
  capacity: number;
  googleFormUrl: string;
  registrationLink?: string;
  responseSheetId?: string;
  responseSheetName?: string;
  lastSyncedAt?: string;
  manualRegistrationCount: number;
  isCertificateEligible: boolean;
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

export interface AttendanceRecord {
  id: string;
  eventId?: string;
  eventTitle?: string;
  eventDate: string;
  status: 'PRESENT' | 'ABSENT';
  method: 'ADMIN' | 'QR';
  markedAt?: string;
}

export interface Certificate {
  certificateId: string;
  studentName: string;
  organization: string;
  institution: string;
  eventDate: string;
  eventDateLabel: string;
  eventName: string;
  issueDate: string;
  issueDateLabel: string;
  status: 'VALID' | 'REVOKED';
  campaignName?: string;
  participationStatus?: 'PARTICIPATED' | 'NOT_PARTICIPATED';
  issuedBy?: string;
  revokedAt?: string;
  qrCode?: string;
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
  certificate: {
    certificateId: string;
    status: 'VALID' | 'REVOKED';
    eventDateLabel: string;
  } | null;
}

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  minimumAttendancePercentage: number;
  minimumEligibleEvents: number;
  releaseDate?: string;
  certificateTemplate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  generatedAt?: string;
}

export interface Member {
  _id: string;
  name: string;
  team: string;
  role: string;
  coordinatorRole: string;
  department: string;
  year: string;
  photo: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
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
  url: string;
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
  certificates: number;
}

export interface AdminStats {
  totalStudents: number;
  verifiedStudents?: number;
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  attendanceRecords: number;
  certificates: number;
  validCertificates: number;
  pendingCertificates: number;
  members: number;
  eventsEmailSent?: number;
  totalResources?: number;
}
