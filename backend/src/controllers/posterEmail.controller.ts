import type { Response } from 'express';
import { EventModel, Student, EventRegistration, Registration, SendingHistory } from '../models/index.js';
import { connectDB } from '../config/db.js';
import { eventQuery } from './event.controller.js';
import { CLUB } from '../config/env.js';
import { sendWebsiteEmail, escapeHtml, sanitizeHeaderValue } from '../services/emailService.js';
import { baseEmailHtml } from '../services/email/templates/base.template.js';

const CANONICAL_DOMAIN = 'https://gdgoc-gcee.vercel.app';

/**
 * Generate Responsive Poster Email Template with GDGoC GCEE branding & CTA
 */
export function generatePosterEmailHtml(opts: {
  studentName?: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  category?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(opts.studentName || 'Student');
  const safeTitle = escapeHtml(opts.eventName);
  const safeDate = escapeHtml(opts.eventDate);
  const safeTime = escapeHtml(opts.eventTime || 'TBA');
  const safeVenue = escapeHtml(opts.venue || CLUB.institution);
  const safeCategory = escapeHtml(opts.category || 'Special Event');
  const safeDesc = opts.description
    ? escapeHtml(opts.description)
    : `Join us for ${safeTitle} hosted by ${CLUB.name}!`;
  const safeCustomMsg = opts.customMessage ? escapeHtml(opts.customMessage) : '';
  const safePoster = opts.posterUrl ? escapeHtml(opts.posterUrl) : '';
  const regLink = escapeHtml(opts.registrationLink);

  const subject = `Official Invitation: ${opts.eventName} – ${CLUB.name}`;

  const posterBlock = safePoster
    ? `
      <div style="text-align: center; margin: 20px 0;">
        <img src="${safePoster}" alt="${safeTitle} Poster" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;" />
      </div>
    `
    : '';

  const customMsgBlock = safeCustomMsg
    ? `
      <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #0369a1; font-size: 14px; line-height: 1.6;">${safeCustomMsg.replace(/\n/g, '<br/>')}</p>
      </div>
    `
    : '';

  const html = baseEmailHtml(`
    <tr>
      <td style="padding: 32px 28px;">
        <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          ${safeCategory}
        </div>
        <h1 style="margin: 0 0 12px 0; color: #0b1b33; font-size: 24px; font-weight: 700; line-height: 1.3;">
          ${safeTitle}
        </h1>
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 14px; line-height: 1.6;">
          We are excited to invite you to <strong>${safeTitle}</strong>! Here are the event details:
        </p>

        ${posterBlock}
        ${customMsgBlock}

        <!-- Event Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600; width: 80px;">📅 Date:</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500;">${safeDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">⏰ Time:</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500;">${safeTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500;">${safeVenue}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeDesc}</p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="${regLink}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
            REGISTER NOW
          </a>
        </div>

        <p style="text-align: center; margin: 0; color: #94a3b8; font-size: 12px;">
          Can't click the button? Copy and paste this link in your browser: <br/>
          <a href="${regLink}" style="color: #2563eb; text-decoration: underline;">${regLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
          Warm regards,<br/>
          <strong>${CLUB.name} Executive Committee</strong><br/>
          ${CLUB.institution}
        </p>
      </td>
    </tr>
  `);

  const text = `Official Invitation: ${opts.eventName} – ${CLUB.name}

Dear ${opts.studentName || 'Student'},

You are invited to ${opts.eventName}!

Date: ${opts.eventDate}
Time: ${opts.eventTime || 'TBA'}
Venue: ${opts.venue || CLUB.institution}

REGISTER NOW: ${opts.registrationLink}

Best regards,
${CLUB.name} Team`;

  return { subject, html, text };
}

/**
 * GET /api/admin/events/:eventId/poster-recipient-count
 */
export async function getPosterRecipientCount(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const recipientType = (req.query.recipientType || 'ALL_STUDENTS').toString();
    const studentIdsRaw = (req.query.studentIds || '').toString();

    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    let recipientCount = 0;

    if (recipientType === 'ALL_STUDENTS') {
      recipientCount = await Student.countDocuments({ isActive: true });
    } else if (recipientType === 'REGISTERED_STUDENTS') {
      const regCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
      const eventRegCount = await EventRegistration.countDocuments({ eventId: event._id });
      recipientCount = Math.max(regCount, eventRegCount);
    } else if (recipientType === 'SELECTED_STUDENTS') {
      const ids = studentIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
      recipientCount = ids.length;
    }

    res.json({
      success: true,
      eventId: event.eventId,
      eventName: event.title,
      posterUrl: (event as any).banner || (event as any).posterUrl || (event as any).poster || '',
      recipientType,
      recipientCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/events/:eventId/send-poster
 */
export async function sendEventPosterEmail(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const {
      recipientType = 'ALL_STUDENTS',
      studentIds = [],
      customSubject,
      customMessage,
      posterUrl,
    } = req.body;

    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const effectivePoster = posterUrl || (event as any).banner || (event as any).posterUrl || (event as any).poster || '';
    const registrationLink = `${CANONICAL_DOMAIN}/events/${event.eventId}`;

    // Collect recipient students
    const recipientMap = new Map<string, { email: string; name: string }>();

    if (recipientType === 'ALL_STUDENTS') {
      const students = await Student.find({ isActive: true }).select('email name').lean();
      students.forEach((s) => {
        if (s.email) recipientMap.set(s.email.toLowerCase().trim(), { email: s.email.toLowerCase().trim(), name: s.name });
      });
    } else if (recipientType === 'REGISTERED_STUDENTS') {
      const regs = await Registration.find({ eventId: event._id, status: 'REGISTERED' })
        .populate('studentId', 'email name')
        .lean();
      regs.forEach((r) => {
        const s = r.studentId as any;
        if (s && s.email) recipientMap.set(s.email.toLowerCase().trim(), { email: s.email.toLowerCase().trim(), name: s.name });
      });

      const eventRegs = await EventRegistration.find({ eventId: event._id }).lean();
      eventRegs.forEach((r) => {
        if (r.email) {
          recipientMap.set(r.email.toLowerCase().trim(), {
            email: r.email.toLowerCase().trim(),
            name: r.studentName || 'Student',
          });
        }
      });
    } else if (recipientType === 'SELECTED_STUDENTS') {
      const selectedIds = Array.isArray(studentIds) ? studentIds : [];
      const students = await Student.find({ _id: { $in: selectedIds } }).select('email name').lean();
      students.forEach((s) => {
        if (s.email) recipientMap.set(s.email.toLowerCase().trim(), { email: s.email.toLowerCase().trim(), name: s.name });
      });
    }

    const recipientList = Array.from(recipientMap.values());
    if (recipientList.length === 0) {
      res.status(400).json({ success: false, message: 'No valid recipient email addresses found for the selected filter.' });
      return;
    }

    const subject = customSubject
      ? sanitizeHeaderValue(customSubject)
      : `Official Invitation: ${event.title} – ${CLUB.name}`;

    // Create Batch record in SendingHistory
    const batchRecord = await SendingHistory.create({
      recordType: 'batch',
      batchId: `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      eventId: event._id,
      eventName: event.title,
      subject,
      recipientCount: recipientList.length,
      successCount: 0,
      failedCount: 0,
      status: 'sending',
      sentAt: new Date(),
    });

    let successCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Dispatch emails individually for privacy & accuracy
    for (const recipient of recipientList) {
      const { subject: mailSubject, html, text } = generatePosterEmailHtml({
        studentName: recipient.name,
        eventName: event.title,
        eventDate: event.date,
        eventTime: (event as any).time || (event as any).startTime ? `${(event as any).time || (event as any).startTime}` : undefined,
        venue: event.venue,
        category: event.category,
        description: event.description,
        customMessage,
        posterUrl: effectivePoster,
        registrationLink,
      });

      const result = await sendWebsiteEmail({
        to: recipient.email,
        subject: customSubject || mailSubject,
        html,
        text,
      });

      const status = result.success ? 'sent' : 'failed';
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        failedEmails.push(recipient.email);
      }

      // Log individual recipient sending history
      await SendingHistory.create({
        recordType: 'recipient',
        batchId: batchRecord.batchId,
        eventId: event._id,
        eventName: event.title,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: customSubject || mailSubject,
        status,
        errorMessage: result.error || '',
        sentAt: new Date(),
      }).catch((e) => console.error('[posterEmail] Failed to log recipient history:', e));
    }

    // Update batch summary
    batchRecord.successCount = successCount;
    batchRecord.failedCount = failedCount;
    batchRecord.status = failedCount === 0 ? 'completed' : successCount > 0 ? 'completed' : 'failed';
    await batchRecord.save();

    res.json({
      success: true,
      message: `Poster email dispatch complete! Sent: ${successCount}, Failed: ${failedCount}`,
      batchId: batchRecord.batchId,
      totalRecipients: recipientList.length,
      successCount,
      failedCount,
      failedEmails,
    });
  } catch (err: any) {
    console.error('[sendEventPosterEmail] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/admin/events/:eventId/poster-email-history
 */
export async function getPosterEmailHistory(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const batches = await SendingHistory.find({ eventId: event._id, recordType: 'batch' })
      .sort({ sentAt: -1 })
      .lean();

    const history = await Promise.all(
      batches.map(async (b) => {
        const recipients = await SendingHistory.find({ batchId: b.batchId, recordType: 'recipient' }).lean();
        return {
          batchId: b.batchId,
          subject: b.subject,
          recipientCount: b.recipientCount,
          successCount: b.successCount,
          failedCount: b.failedCount,
          status: b.status,
          sentAt: b.sentAt,
          recipients: recipients.map((r) => ({
            email: r.recipientEmail,
            name: r.recipientName,
            status: r.status,
            errorMessage: r.errorMessage,
            sentAt: r.sentAt,
          })),
        };
      })
    );

    res.json({
      success: true,
      eventId: event.eventId,
      eventName: event.title,
      history,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/events/:eventId/retry-poster-email
 */
export async function retryFailedPosterEmails(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const { batchId } = req.body;

    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const failedRecords = await SendingHistory.find({
      eventId: event._id,
      batchId,
      recordType: 'recipient',
      status: 'failed',
    }).lean();

    if (failedRecords.length === 0) {
      res.status(400).json({ success: false, message: 'No failed email records found for this batch.' });
      return;
    }

    const effectivePoster = (event as any).banner || (event as any).posterUrl || (event as any).poster || '';
    const registrationLink = `${CANONICAL_DOMAIN}/events/${event.eventId}`;

    let retriedSuccess = 0;
    let retriedFailed = 0;

    for (const record of failedRecords) {
      if (!record.recipientEmail) continue;

      const { subject: mailSubject, html, text } = generatePosterEmailHtml({
        studentName: record.recipientName,
        eventName: event.title,
        eventDate: event.date,
        eventTime: (event as any).time || (event as any).startTime ? `${(event as any).time || (event as any).startTime}` : undefined,
        venue: event.venue,
        category: event.category,
        description: event.description,
        posterUrl: effectivePoster,
        registrationLink,
      });

      const result = await sendWebsiteEmail({
        to: record.recipientEmail,
        subject: record.subject || mailSubject,
        html,
        text,
      });

      if (result.success) {
        retriedSuccess++;
        await SendingHistory.updateOne(
          { _id: record._id },
          { $set: { status: 'sent', errorMessage: '', sentAt: new Date() } }
        );
      } else {
        retriedFailed++;
        await SendingHistory.updateOne(
          { _id: record._id },
          { $set: { errorMessage: result.error || 'Retry failed', sentAt: new Date() } }
        );
      }
    }

    // Update batch stats
    const updatedFailCount = await SendingHistory.countDocuments({ batchId, recordType: 'recipient', status: 'failed' });
    const updatedSuccessCount = await SendingHistory.countDocuments({ batchId, recordType: 'recipient', status: 'sent' });
    await SendingHistory.updateOne(
      { batchId, recordType: 'batch' },
      { $set: { successCount: updatedSuccessCount, failedCount: updatedFailCount, status: updatedFailCount === 0 ? 'completed' : 'failed' } }
    );

    res.json({
      success: true,
      message: `Retry completed! Retried Success: ${retriedSuccess}, Still Failed: ${retriedFailed}`,
      retriedSuccess,
      retriedFailed,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
