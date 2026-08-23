import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EventModel, Registration, GoogleFormRegistration, Student, SendingHistory, EventRegistration } from '../models';
import type { AuthRequest } from '../middleware/auth';
import { nextEventId } from '../utils/ids';
import { todayIST, isDateBefore, formatTimeRange, isEventRegistrationOpen, getEffectiveEventStatus } from '../utils/dates';
import { connectDB } from '../config/db';
import { env, getPublicAppUrl } from '../config/env';
import { sendEventEmail, sendBulkEventRegistrationEmails, emailIsConfigured } from '../lib/mailer';

export function eventQuery(identifier: string) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return { _id: identifier };
  }
  return { eventId: identifier };
}

function isValidGoogleFormUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'docs.google.com' &&
      parsed.pathname.includes('/forms/')
    );
  } catch {
    return false;
  }
}

export function serializeEvent(event: any) {
  const effectiveStatus = getEffectiveEventStatus(event);
  const isRegistrationOpen = isEventRegistrationOpen(event);

  return {
    _id: event._id,
    eventId: event.eventId,
    title: event.title,
    description: event.description,
    shortDescription: event.shortDescription,
    banner: event.banner,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    speaker: event.speaker,
    speakerBio: event.speakerBio,
    category: event.category,
    technologies: event.technologies,
    registrationEnabled: event.registrationEnabled,
    isRegistrationOpen,
    registrationDeadline: event.registrationDeadline,
    capacity: event.capacity,
    googleFormUrl: event.googleFormUrl || '',
    registrationLink: event.registrationLink || '',
    manualRegistrationCount: event.manualRegistrationCount || 0,
    isCertificateEligible: event.isCertificateEligible,
    isInauguration: event.isInauguration,
    emailSent: event.emailSent || false,
    emailSentAt: event.emailSentAt || null,
    emailSentCount: event.emailSentCount || 0,
    emailFailedCount: event.emailFailedCount || 0,
    status: event.status,
    effectiveStatus,
    registeredCount: event.registeredCount ?? 0,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

// GET /api/events  (public)
export async function listEvents(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const { category, status, q, limit } = req.query;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;

    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: 'i' } },
        { description: { $regex: String(q), $options: 'i' } },
        { speaker: { $regex: String(q), $options: 'i' } },
      ];
    }

    const events = await EventModel.find(filter)
      .sort({ date: 1, startTime: 1 })
      .limit(Number(limit) || 100)
      .lean();

    const ids = events.map((e) => e._id);
    const regCounts = await Registration.aggregate([
      { $match: { eventId: { $in: ids }, status: 'REGISTERED' } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(regCounts.map((r) => [String(r._id), r.count]));

    const serialized = events.map((e) => serializeEvent({ ...e, registeredCount: countMap.get(String(e._id)) || 0 }));
    const filteredEvents = status ? serialized.filter((e) => e.effectiveStatus === status) : serialized;

    res.json({
      success: true,
      events: filteredEvents,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/events/:eventId  (public)
export async function getEvent(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId)).lean();

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const registeredCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });

    let isRegistered = false;
    if (req.studentId) {
      isRegistered = (await Registration.countDocuments({ eventId: event._id, studentId: req.studentId, status: 'REGISTERED' })) > 0;
    }

    res.json({
      success: true,
      event: serializeEvent({ ...event, registeredCount }),
      isRegistered,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/events/:eventId/check-membership  (check if student is verified community member)
export async function checkMemberEligibility(req: Request, res: Response) {
  try {
    await connectDB();
    const event = await EventModel.findOne(eventQuery(req.params.eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ success: false, message: 'Student email is required.' });
      return;
    }

    const student = await Student.findOne({ email: cleanEmail, isActive: true }).lean();
    if (!student) {
      res.json({
        success: false,
        isMember: false,
        message: 'Please join GDGoC GCEE before registering for this event.',
        joinUrl: `/join?redirect=/events/${event.eventId}/register`,
      });
      return;
    }

    if (!student.isVerified) {
      res.json({
        success: false,
        isMember: false,
        notVerified: true,
        message: 'Please verify your GDGoC GCEE account email before registering for this event.',
        verifyUrl: '/join',
      });
      return;
    }

    // Check if already registered
    const alreadyRegistered =
      (await Registration.countDocuments({
        eventId: event._id,
        studentId: student._id,
        status: 'REGISTERED',
      })) > 0 ||
      (await GoogleFormRegistration.countDocuments({
        eventId: event._id,
        email: cleanEmail,
      })) > 0 ||
      (await EventRegistration.countDocuments({
        eventId: event._id,
        email: cleanEmail,
        status: 'REGISTERED',
      })) > 0;

    res.json({
      success: true,
      isMember: true,
      isAlreadyRegistered: alreadyRegistered,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        college: student.college || 'Government College of Engineering, Erode',
        department: student.department || '',
        year: student.year || '',
        rollNumber: student.rollNumber || '',
      },
      event: {
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.venue,
        banner: event.banner || '',
        googleFormUrl: event.googleFormUrl || '',
        registrationEnabled: event.registrationEnabled,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/events/:eventId/register-public  (student registration flow with membership verification and instant live attendee count)
export async function registerPublicEvent(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (!isEventRegistrationOpen(event)) {
      res.status(400).json({
        success: false,
        message: 'Registration for this event is closed. Registration closes 1 day before the event date.',
      });
      return;
    }

    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      res.status(400).json({ success: false, message: 'A valid student email address is required.' });
      return;
    }

    const name = (req.body.name || '').trim() || 'Student';
    const phone = (req.body.phone || '').trim();
    const college = (req.body.college || '').trim() || 'Government College of Engineering, Erode';
    const department = (req.body.department || '').trim();
    const year = (req.body.year || '').trim();
    const rollNumber = (req.body.rollNumber || '').trim();

    // Find or create Student record in MongoDB
    let student = await Student.findOne({ email: cleanEmail });
    if (!student) {
      const bcrypt = (await import('bcryptjs')).default;
      const defaultPassword = await bcrypt.hash('student@123', 10);
      student = await Student.create({
        name,
        email: cleanEmail,
        phone,
        college,
        department,
        year,
        rollNumber: rollNumber || undefined,
        passwordHash: defaultPassword,
        isActive: true,
        isVerified: true,
      });
    } else {
      // Update missing profile fields if provided
      let shouldSave = false;
      if (!student.name && name) { student.name = name; shouldSave = true; }
      if (!student.phone && phone) { student.phone = phone; shouldSave = true; }
      if (!student.department && department) { student.department = department; shouldSave = true; }
      if (!student.year && year) { student.year = year; shouldSave = true; }
      if (!student.rollNumber && rollNumber) { student.rollNumber = rollNumber; shouldSave = true; }
      if (!student.isVerified) { student.isVerified = true; shouldSave = true; }
      if (shouldSave) await student.save();
    }

    // Duplicate check: Prevent duplicate registration by the same student for the same event
    const existingRegistration =
      (await Registration.findOne({
        eventId: event._id,
        studentId: student._id,
        status: 'REGISTERED',
      }).lean()) ||
      (await GoogleFormRegistration.findOne({
        eventId: event._id,
        email: cleanEmail,
      }).lean()) ||
      (await EventRegistration.findOne({
        eventId: event._id,
        email: cleanEmail,
        status: 'REGISTERED',
      }).lean());

    if (existingRegistration) {
      const currentLiveCount = await Registration.countDocuments({
        eventId: event._id,
        status: 'REGISTERED',
      });
      const regId =
        (existingRegistration as any).responseId ||
        (existingRegistration as any).googleFormResponseId ||
        `REG-${event.eventId.toUpperCase()}-${String((existingRegistration as any)._id).slice(-6).toUpperCase()}`;

      res.status(400).json({
        success: false,
        message: 'You are already registered for this event.',
        duplicate: true,
        registrationId: regId,
        registeredCount: currentLiveCount,
        googleFormUrl: event.googleFormUrl || '',
      });
      return;
    }

    if (event.capacity > 0) {
      const currentCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
      if (currentCount >= event.capacity) {
        res.status(400).json({ success: false, message: 'This event has reached maximum capacity.' });
        return;
      }
    }

    const registrationId = `REG-${event.eventId.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Record in Registration (Primary relationship: Event -> Registrations -> Students)
    await Registration.findOneAndUpdate(
      { studentId: student._id, eventId: event._id },
      { $set: { status: 'REGISTERED', registeredAt: new Date() } },
      { upsert: true }
    );

    // Record in GoogleFormRegistration & EventRegistration for sync compatibility
    await GoogleFormRegistration.create({
      responseId: registrationId,
      eventId: event._id,
      formData: {
        'Full Name': (name || student.name).trim(),
        'Email Address': cleanEmail,
        'Phone Number': (phone || student.phone || '').trim(),
        'College / Institution': (college || student.college || '').trim(),
        'Department': (department || student.department || '').trim(),
        'Year of Study': (year || student.year || '').trim(),
        'Roll Number / Student ID': (rollNumber || student.rollNumber || '').trim(),
        'Event ID': event.eventId,
        'Event Name': event.title,
      },
      name: (name || student.name).trim(),
      email: cleanEmail,
      phone: (phone || student.phone || '').trim(),
      rollNumber: (rollNumber || student.rollNumber || '').trim(),
      department: (department || student.department || '').trim(),
      year: (year || student.year || '').trim(),
      college: (college || student.college || '').trim(),
      source: 'web-registration',
      submittedAt: new Date(),
    });

    await EventRegistration.findOneAndUpdate(
      { eventId: event._id, email: cleanEmail },
      {
        $set: {
          studentId: student._id,
          studentName: (name || student.name).trim(),
          email: cleanEmail,
          googleFormResponseId: registrationId,
          registeredAt: new Date(),
          status: 'REGISTERED',
        },
      },
      { upsert: true }
    );

    // Calculate exact live attendee count directly from database
    const liveRegisteredCount = await Registration.countDocuments({
      eventId: event._id,
      status: 'REGISTERED',
    });

    // Send confirmation email to student
    try {
      const { sendEventRegistrationConfirmationEmail } = await import('../utils/email.js');
      await sendEventRegistrationConfirmationEmail({
        to: cleanEmail,
        studentName: (name || student.name).trim(),
        eventName: event.title,
        eventDate: event.date,
        eventTime: event.startTime ? `${event.startTime} - ${event.endTime || 'TBA'}` : undefined,
        venue: event.venue,
        registrationId,
        instructions: event.description ? event.description.slice(0, 300) : undefined,
      });
    } catch (emailErr) {
      console.error('[registerPublicEvent] Confirmation email delivery error (non-fatal):', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Attendee count updated.',
      registrationId,
      registeredCount: liveRegisteredCount,
      googleFormUrl: event.googleFormUrl || '',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      event: {
        eventId: event.eventId,
        title: event.title,
        date: event.date,
        venue: event.venue,
      },
    });
  } catch (err: any) {
    console.error('[registerPublicEvent] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/events/:eventId/register  (logged-in student)
export async function registerForEvent(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (!isEventRegistrationOpen(event)) {
      res.status(400).json({
        success: false,
        message: 'Registration for this event is closed. Registration closes 1 day before the event date.',
      });
      return;
    }

    if (event.capacity > 0) {
      const count = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
      if (count >= event.capacity) {
        res.status(400).json({ success: false, message: 'This event has reached its maximum capacity.' });
        return;
      }
    }

    const existing = await Registration.findOne({ studentId: req.studentId, eventId: event._id });
    if (existing) {
      if (existing.status === 'CANCELLED') {
        existing.status = 'REGISTERED';
        existing.registeredAt = new Date();
        await existing.save();
        const liveCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
        res.json({
          success: true,
          message: 'Registration restored. You are registered again!',
          registeredCount: liveCount,
        });
        return;
      }
      const currentLiveCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
      res.status(400).json({
        success: false,
        message: 'You are already registered for this event.',
        duplicate: true,
        registeredCount: currentLiveCount,
      });
      return;
    }

    const reg = await Registration.create({ studentId: req.studentId, eventId: event._id, status: 'REGISTERED' });
    const regId = `REG-${event.eventId.toUpperCase()}-${String(reg._id).slice(-6).toUpperCase()}`;

    // Get live updated count
    const liveRegisteredCount = await Registration.countDocuments({
      eventId: event._id,
      status: 'REGISTERED',
    });

    // Get student info to send confirmation email
    const { Student } = await import('../models/index.js');
    const student = await Student.findById(req.studentId).lean();
    if (student && student.email) {
      try {
        const { sendEventRegistrationConfirmationEmail } = await import('../utils/email.js');
        await sendEventRegistrationConfirmationEmail({
          to: student.email,
          studentName: student.name,
          eventName: event.title,
          eventDate: event.date,
          eventTime: event.startTime ? `${event.startTime} - ${event.endTime || 'TBA'}` : undefined,
          venue: event.venue,
          registrationId: regId,
          instructions: event.description ? event.description.slice(0, 300) : undefined,
        });
      } catch (e) {
        console.error('[registerForEvent] Email confirmation error:', e);
      }
    }

    res.status(201).json({
      success: true,
      message: 'You are registered for this event. Confirmation email has been sent!',
      registrationId: regId,
      registeredCount: liveRegisteredCount,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      const liveCount = await Registration.countDocuments({ eventId: req.params.eventId, status: 'REGISTERED' });
      res.status(400).json({ success: false, message: 'You are already registered for this event.', duplicate: true, registeredCount: liveCount });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/events/:eventId/register  (student)
export async function unregisterFromEvent(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }
    const today = todayIST();
    if (event.date < today) {
      res.status(400).json({ success: false, message: 'Cannot cancel registration after the event date.' });
      return;
    }

    const updated = await Registration.findOneAndUpdate(
      { studentId: req.studentId, eventId: event._id },
      { status: 'CANCELLED' },
      { new: true }
    );
    if (!updated) {
      res.status(400).json({ success: false, message: 'You are not registered for this event.' });
      return;
    }

    const liveCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
    res.json({ success: true, message: 'Registration cancelled.', registeredCount: liveCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/events/my/registered  (student)
export async function myEvents(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const registrations = await Registration.find({ studentId: req.studentId, status: 'REGISTERED' })
      .populate('eventId')
      .sort({ registeredAt: -1 })
      .lean();

    const events = registrations
      .filter((r) => r.eventId)
      .map((r) => serializeEvent(r.eventId));

    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ---------- ADMIN ----------

// GET /api/admin/events
export async function adminListEvents(_: any, res: Response) {
  try {
    await connectDB();

    const events = await EventModel.find().sort({ date: -1 }).lean();
    const ids = events.map((e) => e._id);
    const regCounts = await Registration.aggregate([
      { $match: { eventId: { $in: ids }, status: 'REGISTERED' } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(regCounts.map((r) => [String(r._id), r.count]));
    res.json({
      success: true,
      events: events.map((e) => serializeEvent({ ...e, registeredCount: countMap.get(String(e._id)) || 0 })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events/:eventId
export async function adminGetEvent(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }
    const registeredCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
    res.json({ success: true, event: serializeEvent({ ...event, registeredCount }) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events
export async function adminCreateEvent(req: any, res: Response) {
  try {
    await connectDB();

    const { title, date } = req.body;
    if (!title || !date) {
      res.status(400).json({ success: false, message: 'Title and date are required.' });
      return;
    }

    const eventId = await nextEventId();
    const event = await EventModel.create({
      eventId,
      title,
      description: req.body.description || '',
      shortDescription: req.body.shortDescription || '',
      banner: req.body.banner || '',
      date,
      startTime: req.body.startTime || '',
      endTime: req.body.endTime || '',
      venue: req.body.venue || '',
      speaker: req.body.speaker || '',
      speakerBio: req.body.speakerBio || '',
      category: req.body.category || 'Workshop',
      technologies: req.body.technologies || [],
      registrationEnabled: req.body.registrationEnabled ?? true,
      registrationDeadline: req.body.registrationDeadline || '',
      capacity: Number(req.body.capacity) || 0,
      googleFormUrl: req.body.googleFormUrl || '',
      registrationLink: req.body.registrationLink || '',
      manualRegistrationCount: Number(req.body.manualRegistrationCount) || 0,
      isCertificateEligible: Boolean(req.body.isCertificateEligible),
      isInauguration: Boolean(req.body.isInauguration),
      status: req.body.status || 'UPCOMING',
    });

    res.status(201).json({ success: true, message: 'Event created successfully.', event: serializeEvent(event) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/events/:eventId
export async function adminUpdateEvent(req: any, res: Response) {
  try {
    await connectDB();

    const existing = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!existing) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const allowed = [
      'title', 'description', 'shortDescription', 'banner', 'date', 'startTime', 'endTime', 'venue',
      'speaker', 'speakerBio', 'category', 'technologies', 'registrationEnabled', 'registrationDeadline',
      'capacity', 'googleFormUrl', 'registrationLink', 'manualRegistrationCount', 'isCertificateEligible', 'isInauguration', 'status',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (existing as any)[key] = (key === 'capacity' || key === 'manualRegistrationCount') ? Number(req.body[key]) || 0 : req.body[key];
      }
    }
    await existing.save();

    const registeredCount = await Registration.countDocuments({ eventId: existing._id, status: 'REGISTERED' });
    res.json({ success: true, message: 'Event updated successfully.', event: serializeEvent({ ...existing.toObject(), registeredCount }) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/events/:eventId/status
export async function adminSetEventStatus(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const { status } = req.body;

    const validStatuses = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status provided.' });
      return;
    }

    const event = await EventModel.findOne(eventQuery(eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    event.status = status;
    if (status === 'COMPLETED') {
      event.registrationEnabled = false;
    } else if (status === 'UPCOMING' || status === 'ONGOING') {
      event.registrationEnabled = true;
    }
    await event.save();

    const registeredCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
    res.json({
      success: true,
      message: `Event status updated to ${status}.`,
      event: serializeEvent({ ...event.toObject(), registeredCount }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/events/:eventId
export async function adminDeleteEvent(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }
    await Registration.deleteMany({ eventId: event._id });
    await EventModel.deleteOne({ _id: event._id });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events/:eventId/verified-count
// Number of verified students who would receive the event email.
export async function getVerifiedStudentCount(req: any, res: Response) {
  try {
    await connectDB();
    const count = await Student.countDocuments({ isActive: true, isVerified: true });
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events/:eventId/send-to-all & /api/admin/events/:eventId/send-registration-email
export async function sendEventRegistrationEmailToStudents(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;

    if (!emailIsConfigured()) {
      res.status(400).json({ success: false, message: 'Email service is not configured.' });
      return;
    }

    const event = await EventModel.findOne(eventQuery(eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (event.emailSent && !req.body.force && !req.body.studentIds && !req.body.emails) {
      res.json({
        success: true,
        alreadySent: true,
        message: `This event email was already sent to ${event.emailSentCount} student(s) on ${event.emailSentAt ? new Date(event.emailSentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'unknown date'}. Pass {"force": true} to resend.`,
        emailSentAt: event.emailSentAt,
        emailSentCount: event.emailSentCount,
      });
      return;
    }

    // Support sending to specific selected student IDs, emails, or all verified students
    let filter: Record<string, any> = { isActive: true, isVerified: true };
    if (Array.isArray(req.body.studentIds) && req.body.studentIds.length > 0) {
      filter._id = { $in: req.body.studentIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id)) };
    } else if (Array.isArray(req.body.emails) && req.body.emails.length > 0) {
      const cleanList = req.body.emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean);
      filter.email = { $in: cleanList };
    }

    const targetStudents = await Student.find(filter).lean();
    const recipients = targetStudents
      .filter((s) => s.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
      .map((s) => ({ email: s.email.toLowerCase(), name: s.name || 'Student' }));

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No verified students found for the selected criteria.' });
      return;
    }

    const appUrl = getPublicAppUrl();
    const regUrl =
      event.registrationLink ||
      `${appUrl}/events/${event.eventId}`;

    const subject = `You're Invited! ${event.title} – GDGoC GCEE`;

    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Send one email per student (privacy-safe — no To/CC/BCC with other addresses)
    for (const student of recipients) {
      const result = await sendEventEmail({
        to: student.email,
        studentName: student.name,
        event: {
          title: event.title,
          description: event.description,
          date: event.date,
          time: formatTimeRange(event.startTime, event.endTime),
          venue: event.venue || 'Government College of Engineering, Erode',
          poster: event.banner || '',
          registrationLink: regUrl,
        },
      });

      if (result.success) {
        sentCount++;
        await SendingHistory.create({
          eventId: event._id,
          eventType: 'event-invite',
          recipientEmail: student.email,
          recipientName: student.name,
          subject,
          status: 'sent',
          resendId: result.id || '',
          sentAt: new Date(),
        });
      } else {
        failedCount++;
        failedEmails.push(student.email);
        await SendingHistory.create({
          eventId: event._id,
          eventType: 'event-invite',
          recipientEmail: student.email,
          recipientName: student.name,
          subject,
          status: 'failed',
          errorMessage: result.error || 'Send failed',
          sentAt: new Date(),
        });
      }
    }

    event.emailSent = true;
    event.emailSentAt = new Date();
    event.emailSentCount = (event.emailSentCount || 0) + sentCount;
    event.emailFailedCount = (event.emailFailedCount || 0) + failedCount;
    await event.save();

    res.json({
      success: true,
      message: `Event email sent. Successfully sent: ${sentCount}, Failed: ${failedCount}.`,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
      status: failedCount === 0 ? 'Success' : sentCount > 0 ? 'Partial' : 'Failure',
      failedEmails: failedEmails.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const sendEventToAllStudents = sendEventRegistrationEmailToStudents;
