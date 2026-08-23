import type { Request, Response } from 'express';
import { Student, BulkEmailLog } from '../models/index.js';
import { connectDB } from '../config/db.js';
import { emailIsConfigured, sendBulkEmail } from '../utils/email.js';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/admin/bulk-email/recipients
export async function getBulkEmailRecipients(_req: Request, res: Response) {
  try {
    await connectDB();

    const students = await Student.find({ isActive: true, email: { $ne: '' } })
      .select('name email')
      .lean();

    const validEmails = students.filter((s) => s.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));

    res.json({
      success: true,
      totalRecipients: validEmails.length,
      recipients: validEmails.map((s) => ({ name: s.name, email: s.email })),
    });
  } catch (err: any) {
    console.error('[bulkEmail] getRecipients error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/bulk-email/send
export async function sendBulkEmailToAll(req: Request, res: Response) {
  try {
    await connectDB();

    if (!emailIsConfigured()) {
      res.status(400).json({ success: false, message: 'Email service is not configured. Please set RESEND_API_KEY or email credentials on the server.' });
      return;
    }

    const { subject, message, htmlContent } = req.body;
    if (!subject || !message) {
      res.status(400).json({ success: false, message: 'Subject and message are required.' });
      return;
    }

    if (subject.length > 200) {
      res.status(400).json({ success: false, message: 'Subject must be 200 characters or fewer.' });
      return;
    }

    const students = await Student.find({ isActive: true, email: { $ne: '' } })
      .select('name email')
      .lean();

    const validStudents = students.filter(
      (s) => s.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)
    );

    if (validStudents.length === 0) {
      res.status(404).json({ success: false, message: 'No active students with valid email addresses found.' });
      return;
    }

    const log = await BulkEmailLog.create({
      subject,
      sentBy: (req as any).adminEmail || 'gceegdgoc@gmail.com',
      totalRecipients: validStudents.length,
      successfulSends: 0,
      failedSends: 0,
      status: 'sending',
      errorDetails: [],
      sentAt: null,
    });

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
      const batch = validStudents.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((student) =>
          sendBulkEmail({
            to: student.email,
            studentName: student.name || 'Student',
            subject,
            message,
            htmlContent,
          })
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const student = batch[j];

        if (result.status === 'fulfilled' && !result.value.error) {
          sent++;
        } else {
          failed++;
          const errMsg = result.status === 'rejected'
            ? (result.reason?.message || 'Unknown error')
            : (result.value.error || 'Send failed');
          errors.push({ email: student.email, error: errMsg });
        }
      }

      await BulkEmailLog.findByIdAndUpdate(log._id, {
        successfulSends: sent,
        failedSends: failed,
        errorDetails: errors.slice(0, 50),
      });

      if (i + BATCH_SIZE < validStudents.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const finalStatus = failed === 0 ? 'completed' : sent === 0 ? 'completed' : 'partial';

    await BulkEmailLog.findByIdAndUpdate(log._id, {
      successfulSends: sent,
      failedSends: failed,
      status: finalStatus,
      errorDetails: errors.slice(0, 50),
      sentAt: new Date(),
    });

    res.json({
      success: true,
      message: `Bulk email completed: ${sent} sent, ${failed} failed out of ${validStudents.length} total.`,
      logId: log._id,
      sent,
      failed,
      total: validStudents.length,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    console.error('[bulkEmail] send error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/bulk-email/logs
export async function getBulkEmailLogs(req: Request, res: Response) {
  try {
    await connectDB();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      BulkEmailLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BulkEmailLog.countDocuments(),
    ]);

    res.json({
      success: true,
      logs: logs.map((l) => ({
        _id: l._id,
        subject: l.subject,
        sentBy: l.sentBy,
        totalRecipients: l.totalRecipients,
        successfulSends: l.successfulSends,
        failedSends: l.failedSends,
        status: l.status,
        errorDetails: l.errorDetails,
        sentAt: l.sentAt,
        createdAt: l.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[bulkEmail] getLogs error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}
