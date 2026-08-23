import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { EventModel, Registration, Attendance, Student } from '../models';
import { env } from '../config/env';
import type { AuthRequest } from '../middleware/auth';
import { todayIST } from '../utils/dates';
import { generateQRCodeDataURL } from '../utils/qr';
import { connectDB } from '../config/db';
import { eventQuery } from './event.controller';

const ATTENDANCE_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function attendanceTokenPayload(event: any): string {
  return jwt.sign(
    {
      scope: 'attendance',
      eventId: String(event._id),
      date: event.date,
      exp: Math.floor((Date.now() + ATTENDANCE_TOKEN_TTL_MS) / 1000),
    },
    env.jwtSecret
  );
}

/**
 * Backend-enforced rule:
 * Attendance for an event is valid ONLY on the actual event date (Asia/Kolkata).
 */
function validateAttendanceWindow(eventDate: string): string | null {
  const today = todayIST();
  if (eventDate > today) return 'Attendance can only be marked on the event date.';
  if (eventDate < today) return 'The event date has passed; attendance cannot be backdated.';
  return null;
}

// GET /api/admin/events/:eventId/attendance
export async function adminGetEventAttendance(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const registrations = await Registration.find({ eventId: event._id, status: 'REGISTERED' })
      .populate('studentId')
      .sort({ registeredAt: 1 })
      .lean();

    const attendance = await Attendance.find({ eventId: event._id }).lean();
    const attMap = new Map(attendance.map((a) => [String(a.studentId), a]));

    const students = registrations
      .filter((r) => r.studentId)
      .map((r) => {
        const st = r.studentId as any;
        const att = attMap.get(String(st._id));
        return {
          studentId: st._id,
          name: st.name,
          email: st.email,
          rollNumber: st.rollNumber,
          department: st.department,
          year: st.year,
          status: att?.status || null,
          method: att?.method || null,
          markedAt: att?.markedAt || null,
        };
      });

    res.json({
      success: true,
      event: {
        eventId: event.eventId,
        title: event.title,
        date: event.date,
        isInauguration: event.isInauguration,
      },
      attendanceOpen: validateAttendanceWindow(event.date) === null,
      attendanceError: validateAttendanceWindow(event.date),
      students,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events/:eventId/attendance
export async function adminMarkAttendance(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (event.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Attendance cannot be marked for a cancelled event.' });
      return;
    }

    const windowError = validateAttendanceWindow(event.date);
    if (windowError) {
      res.status(400).json({ success: false, message: windowError });
      return;
    }

    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (entries.length === 0) {
      res.status(400).json({ success: false, message: 'No attendance entries provided.' });
      return;
    }

    const registered = await Registration.find({ eventId: event._id, status: 'REGISTERED' }).select('studentId').lean();
    const registeredIds = new Set(registered.map((r) => String(r.studentId)));

    let marked = 0;
    for (const entry of entries) {
      const { studentId, status } = entry;
      if (!studentId || !registeredIds.has(String(studentId))) continue;
      if (!['PRESENT', 'ABSENT'].includes(status)) continue;

      const existing = await Attendance.findOne({ studentId, eventId: event._id });
      if (existing) {
        existing.status = status;
        existing.markedBy = `admin:${req.adminId}`;
        existing.markedAt = new Date();
        await existing.save();
      } else {
        await Attendance.create({
          studentId,
          eventId: event._id,
          eventDate: event.date,
          status,
          method: 'ADMIN',
          markedBy: `admin:${req.adminId}`,
        });
      }
      marked += 1;
    }

    res.json({ success: true, message: `Attendance recorded for ${marked} student(s).`, marked });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events/:eventId/attendance/qr-token
export async function adminGetAttendanceQrToken(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId));
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const windowError = validateAttendanceWindow(event.date);
    if (windowError) {
      res.status(400).json({ success: false, message: windowError });
      return;
    }
    if (event.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cannot generate QR for a cancelled event.' });
      return;
    }

    const token = attendanceTokenPayload(event);
    const verificationUrl = `${env.appUrl}/api/attendance/qr/scan?token=${encodeURIComponent(token)}`;
    const qr = await generateQRCodeDataURL(verificationUrl);

    res.json({
      success: true,
      message: 'QR attendance code generated. It expires in 15 minutes.',
      qr,
      token,
      expiresAt: new Date(Date.now() + ATTENDANCE_TOKEN_TTL_MS).toISOString(),
      event: { eventId: event.eventId, title: event.title, date: event.date },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/attendance/qr
// The QR encodes a signed, expiring attendance token. Scanning is only
// possible for authenticated, registered students on the exact event date.
export async function qrMarkAttendance(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const token = req.body.token || req.query.token;
    if (!token) {
      res.status(400).json({ success: false, message: 'No QR code data provided.' });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(String(token), env.jwtSecret);
    } catch {
      res.status(400).json({ success: false, message: 'Invalid or expired QR code.' });
      return;
    }

    if (payload.scope !== 'attendance' || !payload.eventId || !payload.date) {
      res.status(400).json({ success: false, message: 'Invalid attendance QR code.' });
      return;
    }

    // 1. Student exists
    const student = await Student.findById(req.studentId).lean();
    if (!student || !student.isActive) {
      res.status(401).json({ success: false, message: 'Student account not found.' });
      return;
    }

    // 2. Event exists and matches the QR
    const event = await EventModel.findById(payload.eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }
    if (String(event._id) !== String(payload.eventId) || event.date !== payload.date) {
      res.status(400).json({ success: false, message: 'QR code does not match this event.' });
      return;
    }

    // 3. Current date equals the event date (Asia/Kolkata)
    if (todayIST() !== event.date) {
      res.status(400).json({
        success: false,
        message: 'Attendance is only available on the event date.',
      });
      return;
    }

    // 4. Event is active
    if (event.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'This event has been cancelled.' });
      return;
    }

    // 5. Student is registered
    const registered = await Registration.findOne({ studentId: student._id, eventId: event._id, status: 'REGISTERED' });
    if (!registered) {
      res.status(403).json({ success: false, message: 'You must register for this event before marking attendance.' });
      return;
    }

    // 6. Inauguration events never count towards certificates (still recorded)
    if (event.isInauguration) {
      res.status(400).json({
        success: false,
        message: 'This is an inauguration event and does not contribute to certificate eligibility.',
      });
      return;
    }

    // 7. Prevent duplicate attendance
    const existing = await Attendance.findOne({ studentId: student._id, eventId: event._id });
    if (existing) {
      res.status(409).json({ success: false, message: 'Attendance already recorded for this event.' });
      return;
    }

    await Attendance.create({
      studentId: student._id,
      eventId: event._id,
      eventDate: event.date,
      status: 'PRESENT',
      method: 'QR',
      markedBy: `qr:${String(student._id)}`,
    });

    res.json({ success: true, message: 'Attendance marked successfully via QR!', student: student.name });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, message: 'Attendance already recorded for this event.' });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/attendance/my  (student)
export async function myAttendance(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const records = await Attendance.find({ studentId: req.studentId })
      .populate('eventId')
      .sort({ eventDate: -1 })
      .lean();

    const list = records
      .filter((r) => r.eventId)
      .map((r) => ({
        id: r._id,
        eventId: (r.eventId as any).eventId,
        eventTitle: (r.eventId as any).title,
        eventDate: r.eventDate,
        status: r.status,
        method: r.method,
        markedAt: r.markedAt,
      }));

    const attended = list.filter((r) => r.status === 'PRESENT').length;
    res.json({ success: true, attendance: list, attendedCount: attended, totalCount: list.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/attendance/records (admin — all records, optionally filtered)
export async function adminListAttendance(req: any, res: Response) {
  try {
    await connectDB();

    const { status, eventId } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (eventId) {
      const event = await EventModel.findOne(eventQuery(String(eventId)));
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found.' });
        return;
      }
      filter.eventId = event._id;
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name email rollNumber department year')
      .populate('eventId', 'eventId title date category')
      .sort({ markedAt: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      records: records.map((r) => ({
        id: r._id,
        student: r.studentId,
        event: r.eventId,
        status: r.status,
        method: r.method,
        markedAt: r.markedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
