import { CLUB } from '../config/env';
import {
  sendGmailEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendEventRegistrationEmail,
  sendWorkshopEmail,
  sendHackathonEmail,
  sendCertificateEmail as sendCertEmail,
  sendAdminAnnouncementEmail,
  sendBulkAnnouncementEmails,
  sendContactEmail,
  sendContactUsNotification,
  sendContactVisitorConfirmation,
  isGmailConfigured,
} from '../services/emailService';
import { getEmailConfigStatus, escapeHtml } from '../lib/mailer';
import { baseEmailHtml } from '../services/email/templates/base.template';

export {
  isGmailConfigured as emailIsConfigured,
  getEmailConfigStatus,
  sendOTPEmail as sendOtpEmail,
  sendWelcomeEmail as sendThankYouEmail,
  sendWelcomeEmail,
  sendEventRegistrationEmail,
  sendWorkshopEmail,
  sendHackathonEmail,
  sendCertEmail as sendCertificateEmail,
  sendAdminAnnouncementEmail,
  sendBulkAnnouncementEmails,
  sendContactEmail,
  sendContactUsNotification,
  sendContactVisitorConfirmation,
};

/**
 * Send Event Registration Confirmation Email with Registration ID
 */
export async function sendEventRegistrationConfirmationEmail(opts: {
  to: string;
  studentName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  registrationId: string;
  instructions?: string;
}): Promise<void> {
  const result = await sendEventRegistrationEmail(opts);
  if (!result.success) {
    console.error('[email] Event confirmation email failed for', opts.to, 'Error:', result.error);
  }
}

/**
 * Send Event Registration List PDF Attachment to Student
 */
export async function sendEventRegistrationPDFEmail(opts: {
  to: string;
  studentName: string;
  eventName: string;
  eventDate: string;
  venue?: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{ id?: string; error?: string }> {
  const safeName = escapeHtml(opts.studentName);
  const safeEvent = escapeHtml(opts.eventName);
  const safeDate = escapeHtml(opts.eventDate);
  const safeVenue = escapeHtml(opts.venue || CLUB.institution);

  const html = baseEmailHtml(`
    <tr>
      <td style="padding: 32px;">
        <p style="margin-top:0; color:#1e293b; font-size: 15px; line-height: 1.5;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="color:#475569; font-size: 14px; line-height: 1.6;">
          Please find attached the official registration list / event document for <strong>${safeEvent}</strong>.
        </p>
        <div style="background-color:#f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin:0 0 4px 0; color:#0b1b33; font-size: 14px; font-weight: 600;">${safeEvent}</p>
          <p style="margin:0; color:#64748b; font-size: 12px;">Date: ${safeDate} &bull; Venue: ${safeVenue}</p>
        </div>
        <p style="color:#475569; font-size: 13px; line-height: 1.6;">
          The complete PDF document is attached with this email for your reference.
        </p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin:0; color:#64748b; font-size: 12px; line-height: 1.5;">
          Best regards,<br/>
          <strong>${CLUB.name} Team</strong><br/>
          ${CLUB.institution}
        </p>
      </td>
    </tr>
  `);

  const result = await sendGmailEmail({
    to: opts.to,
    subject: `${opts.eventName} – Student Registration List`,
    html,
    attachments: [
      {
        filename: opts.filename,
        content: opts.pdfBuffer,
      },
    ],
  });

  if (!result.success) {
    return { error: result.error };
  }
  return { id: result.id };
}

/**
 * Send Student Registration Confirmation (legacy alias)
 */
export async function sendStudentConfirmationEmail(opts: {
  to: string;
  studentName: string;
}): Promise<void> {
  await sendWelcomeEmail(opts);
}

/**
 * Send Bulk Email / Custom Admin Message
 */
export async function sendBulkEmail(opts: {
  to: string;
  studentName: string;
  subject: string;
  message: string;
  htmlContent?: string;
}): Promise<{ id?: string; error?: string }> {
  const safeName = escapeHtml(opts.studentName);
  const safeMessage = opts.htmlContent || `<p style="white-space:pre-wrap; margin:0; line-height:1.6;">${escapeHtml(opts.message)}</p>`;

  const html = baseEmailHtml(`
    <tr>
      <td style="padding: 32px;">
        <p style="margin-top:0; color:#1e293b; font-size: 15px;">Dear <strong>${safeName}</strong>,</p>
        <div style="color:#334155; font-size: 14px; line-height: 1.6; margin:16px 0;">${safeMessage}</div>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin:0; color:#64748b; font-size: 12px;">
          Best regards,<br/>
          <strong>${CLUB.name} Team</strong>
        </p>
      </td>
    </tr>
  `);

  const result = await sendGmailEmail({
    to: opts.to,
    subject: opts.subject,
    html,
  });

  if (!result.success) {
    return { error: result.error };
  }
  return { id: result.id };
}
