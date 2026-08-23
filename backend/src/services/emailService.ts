import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { env, CLUB } from '../config/env';
import { baseEmailHtml, escapeHtml } from './email/templates/base.template';
import { generateOtpEmailHtml } from './email/templates/otp.template';
import { generateWelcomeEmailHtml } from './email/templates/welcome.template';
import { generateEventRegistrationEmailHtml } from './email/templates/eventRegistration.template';
import { generateAnnouncementEmailHtml } from './email/templates/announcement.template';
import { generateCertificateEmailHtml } from './email/templates/certificate.template';

/**
 * GDGoC GCEE — central email service.
 *
 * STRICT PROVIDER SEPARATION:
 *   1. ALL normal website emails (registration, verification, password reset,
 *      event confirmations, notifications, announcements, bulk email…)
 *        → Nodemailer → Gmail SMTP (smtp.gmail.com:465) → gceegdgoc@gmail.com
 *   2. Contact Us form ONLY
 *        → Resend API → gceegdgoc@gmail.com
 *
 * This is the ONLY file that configures SMTP or Resend credentials.
 * Secrets are read from environment variables and never leave the server.
 */

const WEBSITE_GMAIL_ADDRESS = 'gceegdgoc@gmail.com';

// ── Shared header-injection / input sanitization helpers ─────────────

/** Strip CR/LF and control chars to prevent SMTP header injection. */
export function sanitizeHeaderValue(value: string): string {
  return (value || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\r\n\x00-\x1f\x7f]+/g, ' ')
    .trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 1. Nodemailer + Gmail SMTP (normal website emails) ───────────────

let gmailTransporter: Transporter | null = null;

export function getGmailCredentials(): { user: string; appPassword: string } {
  const user = (process.env.GMAIL_USER || env.gmail.user || '').trim().toLowerCase();
  const appPassword = (process.env.GMAIL_APP_PASSWORD || env.gmail.appPassword || '').replace(/\s+/g, '');
  return { user, appPassword };
}

export function isGmailConfigured(): boolean {
  const { user, appPassword } = getGmailCredentials();
  return Boolean(user && appPassword);
}

/** From header used for all normal website emails (the club's Gmail). */
export function getGmailFromAddress(): string {
  const { user } = getGmailCredentials();
  return `${CLUB.name} <${user || 'gceegdgoc@gmail.com'}>`;
}

function getGmailTransporter(): Transporter | null {
  const { user, appPassword } = getGmailCredentials();
  if (!user || !appPassword) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass: appPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export interface GmailMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  /** Safe, user-facing error message (never contains credentials). */
  error?: string;
}

/** Legacy-compatible aliases. */
export type SendMailOptions = GmailMailOptions;
export type SendMailResult = EmailSendResult;

/** Recipient of website-generated notifications / Contact Us messages. */
export function getContactRecipientEmail(): string {
  return env.contactRecipientEmail || WEBSITE_GMAIL_ADDRESS;
}

/** Back-compat alias for isGmailConfigured(). */
export const isEmailConfigured = isGmailConfigured;

/**
 * Send a NORMAL website email via Nodemailer + Gmail SMTP.
 * Used by every transactional flow EXCEPT the Contact Us form.
 */
export async function sendGmailEmail(opts: GmailMailOptions): Promise<EmailSendResult> {
  const cleanTo = (opts.to || '').trim().toLowerCase();
  if (!cleanTo || !isValidEmail(cleanTo)) {
    return { success: false, error: 'Invalid recipient email address format.' };
  }

  if (!isGmailConfigured()) {
    console.error('[emailService] Gmail email service not configured. Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables.');
    return { success: false, error: 'Email service is not configured on the server. Please verify GMAIL_USER and GMAIL_APP_PASSWORD.' };
  }

  // Header-injection protection on subject and envelope fields.
  const safeSubject = sanitizeHeaderValue(opts.subject).slice(0, 998);
  if (!safeSubject) {
    return { success: false, error: 'Invalid email subject.' };
  }

  const transporter = getGmailTransporter()!;
  try {
    const fromAddress = getGmailFromAddress();
    console.log(`[emailService] Sending email to recipient: ${cleanTo} from: ${fromAddress}`);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanTo,
      replyTo: opts.replyTo ? sanitizeHeaderValue(opts.replyTo) : undefined,
      subject: safeSubject,
      html: opts.html,
      text: opts.text || htmlToText(opts.html),
      attachments: opts.attachments,
    });

    console.log('[emailService] Nodemailer response:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    const acceptedList = Array.isArray(info.accepted) ? info.accepted.map((a: any) => String(a).toLowerCase()) : [];
    if (acceptedList.length > 0 && !acceptedList.includes(cleanTo.toLowerCase())) {
      console.error('[emailService] Gmail SMTP rejected recipient:', cleanTo);
      return { success: false, error: 'Gmail SMTP did not accept the recipient address.' };
    }

    return { success: true, id: info.messageId };
  } catch (err: any) {
    // Log full details server-side; return a SAFE message to callers/frontend.
    console.error('[emailService] Gmail SMTP send failed:', {
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
    });
    const safeError =
      err?.code === 'EAUTH'
        ? 'Gmail SMTP authentication failed. Please check GMAIL_USER and GMAIL_APP_PASSWORD.'
        : 'Unable to send OTP via Gmail SMTP. Please check your email and try again.';
    return { success: false, error: safeError };
  }
}

/**
 * Verify Gmail SMTP authentication + connection (used by dev tests).
 */
export async function verifyGmailConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isGmailConfigured()) {
    return { ok: false, error: 'Gmail SMTP is not configured (missing GMAIL_USER / GMAIL_APP_PASSWORD).' };
  }
  try {
    await getGmailTransporter()!.verify();
    return { ok: true };
  } catch (err: any) {
    console.error('[emailService] Gmail SMTP verification failed:', err?.message);
    return { ok: false, error: 'Gmail SMTP verification failed. Check GMAIL_USER / GMAIL_APP_PASSWORD.' };
  }
}

// ── 2. Resend (Contact Us form ONLY) ─────────────────────────────────

let resendInstance: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(env.resendApiKey);
}

function getResendClient(): Resend | null {
  if (!isResendConfigured()) return null;
  if (!resendInstance) {
    resendInstance = new Resend(env.resendApiKey);
  }
  return resendInstance;
}

export interface ContactEmailOptions {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  submittedAt?: Date;
}

/**
 * Send Contact Us notification to the GDGoC GCEE team via Gmail SMTP (Nodemailer).
 */
export async function sendContactUsNotification(opts: ContactEmailOptions): Promise<EmailSendResult> {
  const cleanEmail = (opts.email || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  const recipient = getContactRecipientEmail();
  const submittedAt = opts.submittedAt || new Date();
  const safeName = escapeHtml(opts.name);
  const safeEmail = escapeHtml(cleanEmail);
  const safeSubject = escapeHtml(sanitizeHeaderValue(opts.subject));
  const safeMessage = escapeHtml(opts.message);
  const safePhone = opts.phone ? escapeHtml(opts.phone.trim()) : 'Not provided';
  const safeDate = escapeHtml(
    submittedAt.toLocaleString('en-IN', { timeZone: CLUB.timezone, dateStyle: 'medium', timeStyle: 'short' })
  );

  const html = baseEmailHtml(`
    <tr>
      <td style="padding: 28px 32px;">
        <h2 style="margin:0 0 16px 0; color:#0b1b33; font-size:20px; font-weight:700;">New Contact Form Submission</h2>
        <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px; margin:16px 0;">
          <p style="margin:0 0 8px 0; color:#374151; font-size:14px;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin:0 0 8px 0; color:#374151; font-size:14px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin:0 0 8px 0; color:#374151; font-size:14px;"><strong>Phone:</strong> ${safePhone}</p>
          <p style="margin:0 0 8px 0; color:#374151; font-size:14px;"><strong>Subject:</strong> ${safeSubject}</p>
          <p style="margin:0; color:#64748b; font-size:13px;"><strong>Date:</strong> ${safeDate} (IST)</p>
        </div>
        <p style="margin:16px 0 6px 0; color:#0b1b33; font-size:14px; font-weight:600;">Message:</p>
        <div style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; white-space:pre-wrap; color:#1e293b; font-size:14px; line-height:1.6;">${safeMessage}</div>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="color:#94a3b8; font-size:12px; margin:0;">You can reply directly to this email to respond to ${safeName}.</p>
      </td>
    </tr>
  `);

  const text = `New Contact Form Submission

Name: ${opts.name}
Email: ${cleanEmail}
Phone: ${opts.phone || 'Not provided'}
Subject: ${opts.subject}
Date: ${submittedAt.toISOString()}

Message:
${opts.message}
`;

  return sendGmailEmail({
    to: recipient,
    replyTo: cleanEmail,
    subject: `[Contact Form] ${sanitizeHeaderValue(opts.subject)} – ${opts.name}`,
    html,
    text,
  });
}

/**
 * Send an automated confirmation/thank-you email to the visitor via Gmail SMTP (Nodemailer).
 */
export async function sendContactVisitorConfirmation(opts: {
  name: string;
  email: string;
  subject: string;
}): Promise<EmailSendResult> {
  const cleanEmail = (opts.email || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'Invalid recipient email.' };
  }

  const safeName = escapeHtml(opts.name || 'Friend');
  const safeSubject = escapeHtml(sanitizeHeaderValue(opts.subject));

  const html = baseEmailHtml(`
    <tr>
      <td style="padding: 32px 32px 24px 32px;">
        <h2 style="margin:0 0 16px 0; color:#0b1b33; font-size:20px; font-weight:700;">Thank You for Reaching Out!</h2>
        <p style="margin:0; color:#334155; font-size:15px; line-height:1.5;">Hello <strong>${safeName}</strong>,</p>
        <p style="margin:16px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          Thank you for contacting <strong>${CLUB.name}</strong> regarding <em>"${safeSubject}"</em>.
        </p>
        <p style="margin:12px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          We have received your message and our team will review it and get back to you as soon as possible.
        </p>
        <div style="background-color:#eff6ff; border:1px solid #dbeafe; border-radius:10px; padding:14px 18px; margin:20px 0;">
          <p style="margin:0; color:#1e40af; font-size:13px; line-height:1.5;">
            💡 While you wait, feel free to explore our upcoming events and student community programs on our website.
          </p>
        </div>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="margin:0; color:#475569; font-size:13px; line-height:1.5;">
          Warm regards,<br/>
          <strong>${CLUB.name} Team</strong><br/>
          ${CLUB.institution}
        </p>
      </td>
    </tr>
  `);

  const text = `Hello ${opts.name || 'Friend'},

Thank you for contacting ${CLUB.name} regarding "${opts.subject}".

We have received your message and our team will get back to you as soon as possible.

Warm regards,
${CLUB.name} Team
${CLUB.institution}`;

  return sendGmailEmail({
    to: cleanEmail,
    subject: `Thank you for contacting ${CLUB.name}`,
    html,
    text,
  });
}

/**
 * Send Contact Message to Admin and Visitor Confirmation — Centralized Email Service
 */
export async function sendContactEmail(opts: {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
  phone?: string;
}): Promise<{ id?: string; error?: string }> {
  // 1. Send notification to official club inbox
  const adminResult = await sendContactUsNotification({
    name: opts.fromName,
    email: opts.fromEmail,
    subject: opts.subject,
    message: opts.message,
    phone: opts.phone,
    submittedAt: new Date(),
  });

  if (!adminResult.success) {
    throw new Error(adminResult.error || 'Failed to deliver contact message.');
  }

  // 2. Send confirmation to visitor (async, does not fail main submission)
  sendContactVisitorConfirmation({
    name: opts.fromName,
    email: opts.fromEmail,
    subject: opts.subject,
  }).catch((err) => {
    console.warn('[emailService] Visitor confirmation email warning:', err?.message);
  });

  return { id: adminResult.id };
}

// ── 3. High-level website emails (ALL routed through Gmail/Nodemailer) ──

/**
 * OTP / account verification email.
 */
export async function sendOTPEmail(opts: {
  to: string;
  studentName?: string;
  otp: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateOtpEmailHtml({
    studentName: opts.studentName,
    otp: opts.otp,
  });
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Welcome email upon successful registration / verification.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  studentName?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateWelcomeEmailHtml({
    studentName: opts.studentName,
    rollNumber: opts.rollNumber,
    department: opts.department,
    year: opts.year,
  });
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Event registration confirmation email.
 */
export async function sendEventRegistrationEmail(opts: {
  to: string;
  studentName?: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  registrationId: string;
  instructions?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateEventRegistrationEmailHtml(opts);
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Workshop announcement / invitation email.
 */
export async function sendWorkshopEmail(opts: {
  to: string;
  studentName?: string;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink?: string;
  deadline?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateAnnouncementEmailHtml({
    ...opts,
    type: 'Workshop',
    subject: `Workshop Invitation: ${opts.title} – ${CLUB.name}`,
  });
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Hackathon announcement / invitation email.
 */
export async function sendHackathonEmail(opts: {
  to: string;
  studentName?: string;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink?: string;
  deadline?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateAnnouncementEmailHtml({
    ...opts,
    type: 'Hackathon',
    subject: `Hackathon Announcement: ${opts.title} – ${CLUB.name}`,
  });
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Certificate ready email.
 */
export async function sendCertificateEmail(opts: {
  to: string;
  studentName?: string;
  eventName?: string;
  certificateId: string;
  verificationUrl: string;
  downloadUrl?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateCertificateEmailHtml(opts);
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Admin announcement email (single recipient).
 */
export async function sendAdminAnnouncementEmail(opts: {
  to: string;
  studentName?: string;
  title: string;
  type?: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink?: string;
  deadline?: string;
  subject?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = generateAnnouncementEmailHtml(opts);
  return sendGmailEmail({ to: opts.to, subject, html, text });
}

/**
 * Bulk announcements — sent individually per recipient (privacy-safe).
 */
export async function sendBulkAnnouncementEmails(opts: {
  recipients: Array<{ email: string; name?: string }>;
  title: string;
  type?: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink?: string;
  deadline?: string;
  subject?: string;
  batchSize?: number;
  delayMs?: number;
}): Promise<{
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  failedEmails: string[];
}> {
  const { recipients, batchSize = 10, delayMs = 150 } = opts;
  let sentCount = 0;
  let failedCount = 0;
  const failedEmails: string[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (student) => {
        const res = await sendAdminAnnouncementEmail({
          to: student.email,
          studentName: student.name,
          title: opts.title,
          type: opts.type,
          date: opts.date,
          time: opts.time,
          venue: opts.venue,
          description: opts.description,
          customMessage: opts.customMessage,
          posterUrl: opts.posterUrl,
          registrationLink: opts.registrationLink,
          deadline: opts.deadline,
          subject: opts.subject,
        });

        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
          failedEmails.push(student.email);
        }
      })
    );

    if (i + batchSize < recipients.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    sentCount,
    failedCount,
    totalRecipients: recipients.length,
    failedEmails,
  };
}
