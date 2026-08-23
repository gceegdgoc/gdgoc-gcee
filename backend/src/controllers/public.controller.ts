import type { Response } from 'express';
import { EventModel, Registration, Attendance, Certificate, Member, Student, ContactMessage } from '../models';
import { todayIST } from '../utils/dates';
import { connectDB } from '../config/db';
import { sendContactEmail, emailIsConfigured, getEmailConfigStatus } from '../utils/email';
import { isResendConfigured, sanitizeHeaderValue } from '../services/emailService';

// GET /api/stats  (public — homepage)
export async function publicStats(_: any, res: Response) {
  try {
    await connectDB();
    const today = todayIST();

    const [
      totalEvents,
      upcomingEvents,
      workshops,
      hackathons,
      totalStudents,
      members,
      attendanceRecords,
      certificates,
      totalRegistrations,
    ] = await Promise.all([
      EventModel.countDocuments(),
      EventModel.countDocuments({ status: { $nin: ['COMPLETED', 'CANCELLED'] }, date: { $gte: today } }),
      EventModel.countDocuments({ category: 'Workshop' }),
      EventModel.countDocuments({ category: 'Hackathon' }),
      Student.countDocuments({ isActive: true }),
      Member.countDocuments({ isActive: true }),
      Attendance.countDocuments({ status: 'PRESENT' }),
      Certificate.countDocuments({ status: 'VALID' }),
      Registration.countDocuments({ status: 'REGISTERED' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        workshops,
        hackathons,
        totalStudents,
        members,
        attendanceRecords,
        certificates,
        totalRegistrations,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/email-status  (public — diagnostic, no secrets exposed)
export async function emailStatus(_req: any, res: Response) {
  try {
    const status = getEmailConfigStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/contact  — Contact Us form. Delivery via RESEND ONLY.
export async function contactForm(req: any, res: Response) {
  try {
    await connectDB();
    const { name, email, subject, message, phone } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ success: false, message: 'Name, email, subject and message are required.' });
      return;
    }

    if (typeof name !== 'string' || name.length < 2 || name.length > 200) {
      res.status(400).json({ success: false, message: 'Name must be between 2 and 200 characters.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (typeof subject !== 'string' || subject.trim().length < 3 || subject.length > 200) {
      res.status(400).json({ success: false, message: 'Subject must be between 3 and 200 characters.' });
      return;
    }

    if (typeof message !== 'string' || message.length < 10 || message.length > 5000) {
      res.status(400).json({ success: false, message: 'Message must be between 10 and 5000 characters.' });
      return;
    }

    // Optional phone number — digits, spaces, +, -, ( ) only; max 20 chars.
    let safePhone: string | undefined;
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const phoneStr = String(phone).trim();
      if (!/^[+()\-\s\d]{6,20}$/.test(phoneStr)) {
        res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });
        return;
      }
      safePhone = phoneStr;
    }

    // Header-injection protection: strip CR/LF/control chars from fields that
    // end up in SMTP/MIME headers or the email subject line.
    const safeName = sanitizeHeaderValue(name);
    const safeEmail = sanitizeHeaderValue(email).toLowerCase();
    const safeSubject = sanitizeHeaderValue(subject);

    if (!emailIsConfigured()) {
      console.error('[contact] Email service is not configured. Missing GMAIL_USER or GMAIL_APP_PASSWORD.');
      res.status(503).json({
        success: false,
        message: 'Email service is not configured on the server. Please contact the administrator.',
      });
      return;
    }

    // Persist to MongoDB first so messages are never lost
    try {
      await ContactMessage.create({
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        subject: safeSubject,
        message: message.trim(),
      });
      console.log(`[contact] Contact message saved from ${safeEmail}`);
    } catch (dbErr: any) {
      console.error('[contact] Failed to store contact message:', dbErr.message);
    }

    try {
      await sendContactEmail({
        fromName: safeName,
        fromEmail: safeEmail,
        subject: safeSubject,
        message: message.trim(),
        phone: safePhone,
      });
      console.log(`[contact] Contact email sent to official inbox and confirmation dispatched to ${safeEmail}`);
    } catch (sendErr: any) {
      console.error('[contact] Email delivery failed:', sendErr.message);
      res.status(500).json({
        success: false,
        message: 'Unable to send your message right now. Please try again later.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
    });
  } catch (err: any) {
    console.error('[contact] Unexpected error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send your message. Please try again later.' });
  }
}
