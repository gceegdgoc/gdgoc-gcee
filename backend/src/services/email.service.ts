import { env, CLUB, getPublicAppUrl } from '../config/env';
import { EmailLog } from '../models/EmailLog';
import {
  sendAdminAnnouncementEmail,
  sendWelcomeEmail,
  isGmailConfigured,
  getGmailFromAddress,
} from './emailService';

export {
  sendWelcomeEmail,
  isGmailConfigured as emailIsConfigured,
};

function getFromAddress(): string {
  return getGmailFromAddress();
}

/**
 * 2. SINGLE / INDIVIDUAL EVENT ANNOUNCEMENT EMAIL
 */
export async function sendEventAnnouncementEmail(opts: {
  to: string;
  studentName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventType: string;
  registrationDeadline: string;
  eventRegistrationLink: string;
  eventPoster?: string;
  customSubject?: string;
  customMessage?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isGmailConfigured()) {
    return { success: false, error: 'Email service is not configured.' };
  }

  const result = await sendAdminAnnouncementEmail({
    to: opts.to,
    studentName: opts.studentName,
    title: opts.eventName,
    type: opts.eventType || 'Event',
    date: opts.eventDate,
    time: opts.eventTime,
    venue: opts.eventLocation,
    posterUrl: opts.eventPoster,
    registrationLink: opts.eventRegistrationLink,
    deadline: opts.registrationDeadline,
    customMessage: opts.customMessage,
    subject: opts.customSubject || `Registration Open – ${opts.eventName} [${CLUB.name}]`,
  });

  return result;
}

/**
 * 3. BULK ANNOUNCEMENT DISPATCH WITH LOGGING
 * Sends individually (privacy-safe: never reveals other students' addresses in To/CC/BCC).
 */
export async function sendBulkEventAnnouncement(opts: {
  eventId?: string;
  eventTitle?: string;
  recipients: Array<{ email: string; name: string }>;
  subject: string;
  message?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventType?: string;
  eventPoster?: string;
  registrationDeadline?: string;
  eventRegistrationLink?: string;
}): Promise<{
  sentCount: number;
  failedCount: number;
  status: 'Success' | 'Partial' | 'Failure';
  failedEmails: string[];
}> {
  let sentCount = 0;
  let failedCount = 0;
  const failedEmails: string[] = [];

  for (const student of opts.recipients) {
    if (!student.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
      failedCount++;
      continue;
    }

    const regLink =
      opts.eventRegistrationLink ||
      `${getPublicAppUrl()}/events${opts.eventId ? `/${opts.eventId}` : ''}`;
    const result = await sendEventAnnouncementEmail({
      to: student.email,
      studentName: student.name || 'Student',
      eventName: opts.eventTitle || 'GDGoC Event',
      eventDate: opts.eventDate || 'TBA',
      eventTime: opts.eventTime || 'TBA',
      eventLocation: opts.eventLocation || 'TBA',
      eventType: opts.eventType || 'Workshop',
      eventPoster: opts.eventPoster,
      registrationDeadline: opts.registrationDeadline || 'Until Event Date',
      eventRegistrationLink: regLink,
      customSubject: opts.subject,
      customMessage: opts.message,
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
      failedEmails.push(student.email);
    }
  }

  let status: 'Success' | 'Partial' | 'Failure' = 'Success';
  if (failedCount > 0 && sentCount > 0) status = 'Partial';
  if (sentCount === 0 && opts.recipients.length > 0) status = 'Failure';

  try {
    await EmailLog.create({
      eventId: opts.eventId || null,
      eventTitle: opts.eventTitle || '',
      sender: 'Admin',
      recipientsCount: opts.recipients.length,
      subject: opts.subject,
      message: opts.message || '',
      sentCount,
      failedCount,
      status,
      failedEmails,
    });
  } catch (logErr: any) {
    console.error('[email.service] Failed to create EmailLog record:', logErr.message);
  }

  return { sentCount, failedCount, status, failedEmails };
}

export { getFromAddress };