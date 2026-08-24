// @ts-nocheck
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EventModel, Registration, GoogleFormRegistration, Student, SendingHistory, EventRegistration, EVENT_CATEGORIES, EVENT_STATUSES } from '../models';
import type { AuthRequest } from '../middleware/auth';
import { nextEventId } from '../utils/ids';
import { todayIST, isDateBefore, isEventRegistrationOpen, getEffectiveEventStatus, formatFullDate, formatTimeRange } from '../utils/dates';
import { safeString } from '../utils/safe';
import { connectDB } from '../config/db';
import { EMAIL_REGISTRATION_URL } from '../config/env';
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
    slug: event.slug || '',
    description: event.description,
    shortDescription: event.shortDescription,
    banner: event.banner,
    poster: event.poster || event.banner || '',
    date: event.date,
    time: event.time || '',
    venue: event.venue,
    speaker: event.speaker,
    speakerBio: event.speakerBio,
    category: event.category,
    eventType: event.eventType || event.category,
    technologies: event.technologies,
    registrationEnabled: event.registrationEnabled,
    isRegistrationOpen,
    registrationDeadline: event.registrationDeadline,
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
      .sort({ date: 1 })
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

/** Safe request summary logging (field names only — never values). */
function logAdminAction(route: string, req: any, normalized?: Record<string, unknown>) {
  try {
    const keys = req?.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    const posterLen = typeof req?.body?.poster === 'string' ? req.body.poster.length : 0;
    console.log(
      `[ADMIN EVENT] ${route} | received fields: [${keys.join(', ')}]` +
        ` | normalized fields: [${normalized ? Object.keys(normalized).join(', ') : '-'}]` +
        (posterLen ? ` | poster: dataURL(${posterLen} chars)` : '')
    );
  } catch {
    // logging must never break the request
  }
}

/** Structured validation-error response (never leak raw Mongoose text first). */
function validationError(res: Response, errors: Record<string, string>) {
  res.status(400).json({
    success: false,
    message: 'Validation failed. Please check the highlighted fields.',
    errors,
  });
}

const asTrimmed = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const asString = (v: unknown, fallback = '') => {
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
};
const asStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};
const asNumber = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const asBool = (v: unknown, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return Boolean(v);
};

function generateSlugFromTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

/**
 * Canonical Event payload builder.
 * Accepts both new-style fields (category/banner/startTime/...) and
 * legacy aliases (eventType/poster/time/slug/registrationUrl/googleFormUrl)
 * and produces exactly the object the database expects.
 */
export function normalizeEventPayload(body: any = {}) {
  const categoryRaw = asString(body.category || body.eventType || 'Other');
  const category = (EVENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'Other';

  const time = asString(body.time);

  // Poster and banner are the same asset under two names; keep them mirrored.
  const image = asString(body.poster || body.banner);

  const isInauguration = asBool(body.isInauguration, false);

  const statusRaw = String(asString(body.status, 'UPCOMING')).toUpperCase();
  const status = (EVENT_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as (typeof EVENT_STATUSES)[number])
    : 'UPCOMING';

  const payload: Record<string, unknown> = {
    title: asString(body.title),
    // Slug is generated synchronously here AND by a schema pre-validate hook,
    // so it can never be undefined regardless of the write path.
    slug: asString(body.slug) || generateSlugFromTitle(asString(body.title)),
    date: body.date,
    time,
    venue: asString(body.venue),
    description: asString(body.description),
    shortDescription: asString(body.shortDescription),
    banner: image,
    poster: image,
    category,
    eventType: category,
    speaker: asString(body.speaker),
    speakerBio: asString(body.speakerBio),
    speakers: asStringArray(body.speakers),
    agenda: asString(body.agenda),
    technologies: asStringArray(body.technologies),
    registrationEnabled: asBool(body.registrationEnabled, true),
    registrationDeadline: asString(body.registrationDeadline),
    googleFormUrl: asString(body.googleFormUrl || body.registrationUrl),
    registrationLink: asString(body.registrationLink),
    manualRegistrationCount: Math.max(0, asNumber(body.manualRegistrationCount, 0)),
    isCertificateEligible: isInauguration ? false : asBool(body.isCertificateEligible, false),
    isInauguration,
    status,
  };

  // Remove keys that are undefined so Mongoose defaults apply cleanly.
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}

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

    const eventData = normalizeEventPayload(req.body);

    const errors: Record<string, string> = {};
    if (!eventData.title) errors.title = 'Event title is required.';
    if (!eventData.date || isNaN(new Date(eventData.date as any).getTime())) {
      errors.date = 'A valid event date is required.';
    }
    if (Object.keys(errors).length > 0) {
      logAdminAction('POST /api/admin/events [invalid]', req, eventData);
      validationError(res, errors);
      return;
    }

    const eventId = await nextEventId();

    let event: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        event = await EventModel.create({ ...eventData, eventId });
        break;
      } catch (err: any) {
        // Duplicate slug — regenerate deterministically and retry.
        if (err?.code === 11000 && String(err?.message || '').includes('slug')) {
          eventData.slug = `${String(eventData.slug || 'event')}-${Math.random().toString(36).slice(2, 6)}`;
          continue;
        }
        throw err;
      }
    }

    if (!event) {
      res.status(500).json({ success: false, message: 'Could not allocate a unique slug. Please retry.' });
      return;
    }

    logAdminAction('POST /api/admin/events', req, eventData);
    res.status(201).json({ success: true, message: 'Event created successfully.', event: serializeEvent(event) });
  } catch (err: any) {
    console.error('[ADMIN EVENT] create failed:', err.message);
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

    // Validate against the MERGED document (stored values + incoming patch),
    // so partial updates never fail on fields the client did not send.
    const eventData = normalizeEventPayload({
      ...(existing.toObject() as Record<string, unknown>),
      ...req.body,
      // Never change the slug implicitly on update; keep the stored one unless explicitly provided.
      slug: req.body?.slug || undefined,
    });

    // Empty slug on update means "keep the existing one".
    if (!eventData.slug) delete (eventData as any).slug;
    if (!eventData.time) delete (eventData as any).time;

    const errors: Record<string, string> = {};
    if (!eventData.title) errors.title = 'Event title is required.';
    if (!eventData.date || isNaN(new Date(eventData.date as any).getTime())) {
      errors.date = 'A valid event date is required.';
    }
    if (Object.keys(errors).length > 0) {
      logAdminAction(`PUT /api/admin/events/${req.params.eventId} [invalid]`, req, eventData);
      validationError(res, errors);
      return;
    }

    delete (eventData as any)._id;

    Object.assign(existing, eventData);
    await existing.save();

    logAdminAction(`PUT /api/admin/events/${req.params.eventId}`, req, eventData);
    const registeredCount = await Registration.countDocuments({ eventId: existing._id, status: 'REGISTERED' });
    res.json({ success: true, message: 'Event updated successfully.', event: serializeEvent({ ...existing.toObject(), registeredCount }) });
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      for (const [path, e] of Object.entries<any>(err.errors || {})) errors[path] = e.message;
      validationError(res, errors);
      return;
    }
    console.error('[ADMIN EVENT] update failed:', err.message);
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

/** Same shape as the JS-side email filter below, usable inside MongoDB queries. */
const VALID_EMAIL_QUERY = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/events/:eventId/verified-count
// Number of verified students with a VALID email address who would receive the
// event email. Mirrors the recipient filter in sendEventRegistrationEmailToStudents
// so the admin progress UI shows the real total ("Progress: 0 / N").
export async function getVerifiedStudentCount(req: any, res: Response) {
  try {
    await connectDB();
    const count = await Student.countDocuments({
      isActive: true,
      isVerified: true,
      email: { $exists: true, $type: 'string', $regex: VALID_EMAIL_QUERY.source, $options: 'i' },
    });
    res.json({ success: true, count });
  } catch (err: any) {
    console.error('[event] getVerifiedStudentCount error:', err.message);
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

    // Recipients are resolved and counted BEFORE any SendingHistory record is
    // created — recipientCount is a required field and must always be exact.
    const recipients = targetStudents
      .filter((s) => typeof s.email === 'string' && s.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim()))
      .map((s) => ({ email: s.email.toLowerCase(), name: s.name || 'Student' }));

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No verified students with valid email addresses found.' });
      return;
    }

    const regUrl = EMAIL_REGISTRATION_URL;

    const subject = `You're Invited! ${event.title} – GDGoC GCEE`;
    const eventName = safeString(event.title) || safeString(event.eventId);
    const batchStartedAt = new Date();
    // Exact number of eligible recipients — stored on every history record.
    const recipientCount = recipients.length;

    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    /** History writes must never abort the remaining sends; log and continue. */
    const recordHistory = async (entry: Record<string, unknown>) => {
      try {
        await SendingHistory.create({
          eventId: event._id,
          eventName,
          eventType: 'event-invite',
          subject,
          recipientCount,
          startedAt: batchStartedAt,
          sentAt: new Date(),
          ...entry,
        });
      } catch (historyErr: any) {
        console.error('[event] Failed to write SendingHistory entry:', historyErr.message);
      }
    };

    // Send one email per student (privacy-safe — no To/CC/BCC with other addresses)
    for (const student of recipients) {
      const result = await sendEventEmail({
        to: student.email,
        studentName: student.name,
        event: {
          title: safeString(event.title),
          description: safeString(event.description),
          // Mongoose returns `date` as a Date object — render a human label,
          // never pass the raw object into string-template code.
          date: formatFullDate(event.date),
          time: formatTimeRange(event.startTime || event.time, event.endTime),
          venue: safeString(event.venue) || 'Government College of Engineering, Erode',
          poster: safeString(event.banner),
          registrationLink: regUrl,
        },
      });

      const completedAt = new Date();
      if (result.success) {
        sentCount++;
        await recordHistory({
          recipientEmail: student.email,
          recipientName: student.name,
          status: 'sent',
          resendId: result.id || '',
          completedAt,
          sentCount: 1,
          failedCount: 0,
        });
      } else {
        failedCount++;
        failedEmails.push(student.email);
        await recordHistory({
          recipientEmail: student.email,
          recipientName: student.name,
          status: 'failed',
          errorMessage: result.error || 'Send failed',
          completedAt,
          sentCount: 0,
          failedCount: 1,
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
      recipientCount,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
      status: failedCount === 0 ? 'Success' : sentCount > 0 ? 'Partial' : 'Failure',
      failedEmails: failedEmails.slice(0, 50),
      startedAt: batchStartedAt.toISOString(),
      completedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[event] sendEventRegistrationEmailToStudents error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

export const sendEventToAllStudents = sendEventRegistrationEmailToStudents;
