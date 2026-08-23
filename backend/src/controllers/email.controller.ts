import type { Response } from 'express';
import { EventModel, Student, GoogleFormRegistration, EmailLog } from '../models';
import { connectDB } from '../config/db';
import { sendBulkEventAnnouncement } from '../services/email.service';

import { getPublicAppUrl } from '../config/env';

// POST /api/admin/events/:eventId/send-announcement
export async function sendEventAnnouncement(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const { recipientGroup, subject, message } = req.body;

    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    // Determine target recipient list
    let recipients: Array<{ email: string; name: string }> = [];

    if (recipientGroup === 'registered') {
      // Students registered for this event
      const registeredForm = await GoogleFormRegistration.find({ eventId: event._id }).lean();
      recipients = registeredForm.map((r) => ({ email: r.email, name: r.name }));
    } else if (recipientGroup === 'unregistered') {
      // All students minus registered students
      const registeredForm = await GoogleFormRegistration.find({ eventId: event._id }).lean();
      const regEmails = new Set(registeredForm.map((r) => r.email.toLowerCase()));
      const allStudents = await Student.find({ isActive: true }).lean();
      recipients = allStudents
        .filter((s) => !regEmails.has(s.email.toLowerCase()))
        .map((s) => ({ email: s.email, name: s.name }));
    } else {
      // Default: All Students
      const allStudents = await Student.find({ isActive: true }).lean();
      recipients = allStudents.map((s) => ({ email: s.email, name: s.name }));
    }

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No eligible recipients found for the selected group.' });
      return;
    }

    const appUrl = getPublicAppUrl();
    const regUrl = event.registrationLink || `${appUrl}/events/${event.eventId}`;
    const emailSubject = subject || `Registration Open – ${event.title}`;

    const result = await sendBulkEventAnnouncement({
      eventId: String(event._id),
      eventTitle: event.title,
      recipients,
      subject: emailSubject,
      message,
      eventDate: event.date,
      eventTime: event.startTime ? `${event.startTime} - ${event.endTime || ''}` : 'TBA',
      eventLocation: event.venue || 'TBA',
      eventType: event.category || 'Workshop',
      registrationDeadline: event.registrationDeadline || 'Until Event Date',
      eventRegistrationLink: regUrl,
    });

    res.json({
      success: true,
      message: `Email announcement completed. Sent: ${result.sentCount}, Failed: ${result.failedCount}.`,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      status: result.status,
      failedEmails: result.failedEmails,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/email-history
export async function getEmailHistory(_: any, res: Response) {
  try {
    await connectDB();
    const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
