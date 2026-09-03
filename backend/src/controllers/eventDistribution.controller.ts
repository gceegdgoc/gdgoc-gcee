import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EventModel, GoogleFormRegistration, Registration, SendingHistory } from '../models';
import { connectDB } from '../config/db';
import { emailIsConfigured, getEmailConfigStatus, sendEventRegistrationPDFEmail } from '../utils/email';
import { getResendCompatibleMailer } from '../lib/mailer';
import { generateRegistrationListPDFBuffer, type StudentRegistrationPdfRow } from '../utils/pdf';
import { safeString } from '../utils/safe';
import { SITE_EMAIL } from '../config/env';

function escapeHtml(value: unknown): string {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFromAddress(): string {
  const status = getEmailConfigStatus();
  if (status.fromEmail) return `GCEE Tech Hub <${status.fromEmail}>`;
  return `GCEE Tech Hub <${SITE_EMAIL}>`;
}

// Helper to fetch all registered students for an event
export async function getEventStudentsList(eventId: any): Promise<StudentRegistrationPdfRow[]> {
  const [formRegs, directRegs] = await Promise.all([
    GoogleFormRegistration.find({ eventId }).sort({ submittedAt: -1 }).lean(),
    Registration.find({ eventId, status: 'REGISTERED' }).populate('studentId').lean(),
  ]);

  const seenEmails = new Set<string>();
  const students: StudentRegistrationPdfRow[] = [];

  for (const r of formRegs) {
    const email = (r.email || '').toLowerCase().trim();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);

    students.push({
      registrationId: r.responseId || `REG-${String(r._id).slice(-6).toUpperCase()}`,
      name: r.name || 'Student',
      email: r.email || '—',
      phone: r.phone || '—',
      department: r.department || '—',
      year: r.year || '—',
      college: r.college || 'Government College of Engineering, Erode',
      registeredAt: r.submittedAt,
    });
  }

  for (const r of directRegs) {
    const s = r.studentId as any;
    if (!s) continue;
    const email = (s.email || '').toLowerCase().trim();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);

    students.push({
      registrationId: `REG-${String(r._id).slice(-6).toUpperCase()}`,
      name: s.name || 'Student',
      email: s.email || '—',
      phone: s.phone || '—',
      department: s.department || '—',
      year: s.year || '—',
      college: s.college || 'Government College of Engineering, Erode',
      registeredAt: r.registeredAt,
    });
  }

  return students;
}

// GET /api/admin/events/:eventId/registration-list  (Download PDF)
export async function generateRegistrationListPDF(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const students = await getEventStudentsList(event._id);

    if (students.length === 0) {
      res.status(404).json({ success: false, message: 'No registrations found for this event.' });
      return;
    }

    const pdfBuffer = await generateRegistrationListPDFBuffer({
      eventName: event.title,
      eventDate: event.date,
      venue: event.venue,
      students,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${eventId}-registrations.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[eventDistribution] generateRegistrationListPDF error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events/:eventId/send-pdf  (Send PDF to ALL registered students)
export async function sendEventRegistrationPDFToAll(req: any, res: Response) {
  try {
    await connectDB();

    if (!emailIsConfigured()) {
      res.status(400).json({ success: false, message: 'Email service is not configured. Please configure RESEND_API_KEY on the server.' });
      return;
    }

    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const students = await getEventStudentsList(event._id);
    const studentsWithEmail = students.filter((s) => s.email && s.email.includes('@'));

    if (studentsWithEmail.length === 0) {
      res.status(404).json({ success: false, message: 'No registered students with valid emails found for this event.' });
      return;
    }

    // Generate fresh PDF buffer
    const pdfBuffer = await generateRegistrationListPDFBuffer({
      eventName: event.title,
      eventDate: event.date,
      venue: event.venue,
      students,
    });

    const filename = `${event.eventId}-registrations.pdf`;
    // Resolved BEFORE any history record is created — recipientCount is required.
    const recipientCount = studentsWithEmail.length;
    const subject = `${event.title} – Student Registration List / Event Document`;
    const batchStartedAt = new Date();
    let sent = 0;
    let failed = 0;
    const failedEmails: string[] = [];

    /** History writes must never abort the remaining sends; log and continue. */
    const recordHistory = async (entry: Record<string, unknown>) => {
      try {
        await SendingHistory.create({
          eventId: event._id,
          eventName: event.title || '',
          eventType: 'registration-list-pdf',
          subject,
          recipientCount,
          startedAt: batchStartedAt,
          sentAt: new Date(),
          ...entry,
        });
      } catch (historyErr: any) {
        console.error('[eventDistribution] Failed to write SendingHistory entry:', historyErr.message);
      }
    };

    // Send individual emails to each student (never to admin, never using CC/BCC)
    for (const student of studentsWithEmail) {
      const result = await sendEventRegistrationPDFEmail({
        to: student.email,
        studentName: student.name,
        eventName: event.title,
        eventDate: event.date,
        venue: event.venue,
        pdfBuffer,
        filename,
      });

      if (result.error) {
        failed++;
        failedEmails.push(`${student.email}: ${result.error}`);
        await recordHistory({
          recipientEmail: student.email,
          recipientName: student.name,
          status: 'failed',
          errorMessage: result.error,
          completedAt: new Date(),
          sentCount: 0,
          failedCount: 1,
        });
      } else {
        sent++;
        await recordHistory({
          recipientEmail: student.email,
          recipientName: student.name,
          status: 'sent',
          resendId: result.id || '',
          completedAt: new Date(),
          sentCount: 1,
          failedCount: 0,
        });
      }
    }

    res.json({
      success: true,
      message: `PDF sent to ${sent} student(s) successfully (${failed} failed).`,
      sent,
      failed,
      total: studentsWithEmail.length,
      failedEmails: failedEmails.slice(0, 10),
      sentAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[eventDistribution] sendEventRegistrationPDFToAll error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events/:eventId/send-emails
export async function sendEventEmails(req: any, res: Response) {
  try {
    await connectDB();

    if (!emailIsConfigured()) {
      res.status(400).json({ success: false, message: 'Email service is not configured. Please configure RESEND_API_KEY on the server.' });
      return;
    }

    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const { subject, message, type, customEmails } = req.body;
    if (!subject || !message) {
      res.status(400).json({ success: false, message: 'Subject and message are required.' });
      return;
    }

    // Build recipient list: use customEmails if provided, otherwise fetch from DB
    let studentsWithEmail: Array<{ email: string; name: string }> = [];

    if (Array.isArray(customEmails) && customEmails.length > 0) {
      // Custom email list mode — admin pasted/typed emails manually
      studentsWithEmail = customEmails
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.includes('@'))
        .map((email: string) => ({ email, name: email.split('@')[0] }));
    } else {
      // DB-driven mode — look up actual registrations
      const students = await getEventStudentsList(event._id);
      studentsWithEmail = students.filter((s) => s.email && s.email.includes('@'));
    }

    if (studentsWithEmail.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No recipients found. Either add student registrations via Form Registrations, or paste email addresses in the Custom Email List box.',
      });
      return;
    }

    // Send emails individually (never to admin)
    const gmailMailer = getResendCompatibleMailer();
    const fromAddress = getFromAddress();

    // Resolved BEFORE any history record is created — recipientCount is required.
    const recipientCount = studentsWithEmail.length;
    const batchStartedAt = new Date();

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    /** History writes must never abort the remaining sends; log and continue. */
    const recordHistory = async (entry: Record<string, unknown>) => {
      try {
        await SendingHistory.create({
          eventId: event._id,
          eventName: event.title || '',
          eventType: type || 'event-email',
          subject,
          recipientCount,
          startedAt: batchStartedAt,
          sentAt: new Date(),
          ...entry,
        });
      } catch (historyErr: any) {
        console.error('[eventDistribution] Failed to write SendingHistory entry:', historyErr.message);
      }
    };

    for (const student of studentsWithEmail) {
      const safeName = escapeHtml(student.name);
      const safeSubject = escapeHtml(subject);
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background:#0b1b33; padding: 18px 24px; color:#fff;">
          <h2 style="margin:0; font-size:18px;">GCEE Tech Hub</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin-top:0; color:#374151;">Dear <strong>${safeName}</strong>,</p>
          <p style="color:#374151;">${safeMessage}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="color:#9aa5b1;font-size:12px;">${escapeHtml(event.title)} — ${event.date}</p>
          <p style="color:#9aa5b1;font-size:12px;">GCEE Tech Hub · Government College of Engineering, Erode</p>
        </div>
      </div>`;

      try {
        const { data, error } = await gmailMailer.emails.send({
          from: fromAddress,
          to: student.email,
          subject: `[GCEE Tech Hub] ${subject}`,
          html,
        });

        if (error) {
          failed++;
          errors.push(`${student.email}: ${error.message}`);
          await recordHistory({
            recipientEmail: student.email,
            recipientName: student.name,
            status: 'failed',
            errorMessage: error.message || 'Send failed',
            completedAt: new Date(),
            sentCount: 0,
            failedCount: 1,
          });
        } else {
          sent++;
          await recordHistory({
            recipientEmail: student.email,
            recipientName: student.name,
            status: 'sent',
            resendId: data?.id || '',
            completedAt: new Date(),
            sentCount: 1,
            failedCount: 0,
          });
        }
      } catch (err: any) {
        failed++;
        errors.push(`${student.email}: ${err.message}`);
        await recordHistory({
          recipientEmail: student.email,
          recipientName: student.name,
          status: 'failed',
          errorMessage: err.message,
          completedAt: new Date(),
          sentCount: 0,
          failedCount: 1,
        });
      }
    }

    res.json({
      success: true,
      message: `Emails sent: ${sent} successful, ${failed} failed out of ${studentsWithEmail.length} total.`,
      sent,
      failed,
      total: studentsWithEmail.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err: any) {
    console.error('[eventDistribution] sendEventEmails error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}


// GET /api/admin/events/:eventId/sending-history
export async function getEventSendingHistory(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = mongoose.Types.ObjectId.isValid(eventId)
      ? await EventModel.findById(eventId).lean()
      : await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const eventTypeFilter: { eventId: any; eventType?: string } = { eventId: event._id };
    if (req.query.eventType) eventTypeFilter.eventType = String(req.query.eventType);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total, stats] = await Promise.all([
      SendingHistory.find(eventTypeFilter).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      SendingHistory.countDocuments(eventTypeFilter),
      SendingHistory.aggregate([
        { $match: eventTypeFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statsMap = new Map(stats.map((s) => [s._id, s.count]));

    res.json({
      success: true,
      history: items.map((h) => ({
        _id: h._id,
        eventType: h.eventType,
        recipientEmail: h.recipientEmail,
        recipientName: h.recipientName,
        subject: h.subject,
        status: h.status,
        errorMessage: h.errorMessage,
        sentAt: h.sentAt,
        // Legacy rows (pre-migration) may lack these — null, never undefined/crash.
        eventName: h.eventName ?? null,
        recipientCount: typeof h.recipientCount === 'number' ? h.recipientCount : null,
        sentCount: typeof h.sentCount === 'number' ? h.sentCount : null,
        failedCount: typeof h.failedCount === 'number' ? h.failedCount : null,
        startedAt: h.startedAt ?? null,
        completedAt: h.completedAt ?? null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        sent: statsMap.get('sent') || 0,
        failed: statsMap.get('failed') || 0,
        pending: statsMap.get('pending') || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

