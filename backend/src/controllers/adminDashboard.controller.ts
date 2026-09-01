import type { Response } from 'express';
import { Registration, Attendance, EventModel, EventRegistration, GoogleFormRegistration } from '../models';
import { connectDB } from '../config/db';

// GET /api/admin/registrations  (admin — registered students per event, consolidated across all sources)
export async function adminListRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.query;

    let targetEventObjectId: any = null;
    if (eventId) {
      const event = await EventModel.findOne({ $or: [{ eventId }, { _id: eventId }] }).lean();
      if (event) targetEventObjectId = event._id;
    }

    const regFilter: Record<string, unknown> = { status: 'REGISTERED' };
    const eventRegFilter: Record<string, unknown> = { status: { $ne: 'CANCELLED' } };
    const formFilter: Record<string, unknown> = {};

    if (targetEventObjectId) {
      regFilter.eventId = targetEventObjectId;
      eventRegFilter.eventId = targetEventObjectId;
      formFilter.eventId = targetEventObjectId;
    }

    const [regs, eventRegs, formRegs] = await Promise.all([
      Registration.find(regFilter)
        .populate('studentId', 'name email rollNumber department year phone')
        .populate('eventId', 'eventId title date category')
        .sort({ registeredAt: -1 })
        .limit(500)
        .lean(),
      EventRegistration.find(eventRegFilter)
        .populate('eventId', 'eventId title date category')
        .sort({ registeredAt: -1 })
        .limit(500)
        .lean(),
      GoogleFormRegistration.find(formFilter)
        .populate('eventId', 'eventId title date category')
        .sort({ submittedAt: -1 })
        .limit(500)
        .lean(),
    ]);

    const combinedMap = new Map<string, any>();

    // 1. Process Registration collection
    for (const rawR of regs) {
      const r = rawR as any;
      const student = r.studentId as any;
      const event = r.eventId as any;
      if (!event) continue;
      const email = student?.email ? student.email.toLowerCase().trim() : '';
      const key = `${String(event._id)}_${email || String(r._id)}`;

      combinedMap.set(key, {
        id: r._id,
        studentName: student?.name || 'Registered Student',
        studentEmail: student?.email || '',
        rollNumber: student?.rollNumber || '',
        department: student?.department || '',
        year: student?.year || '',
        eventId: event.eventId,
        eventTitle: event.title,
        eventDate: event.date,
        eventCategory: event.category,
        registeredAt: r.registeredAt || r.createdAt || new Date(),
        status: r.status,
      });
    }

    // 2. Process EventRegistration collection
    for (const rawR of eventRegs) {
      const r = rawR as any;
      const event = r.eventId as any;
      if (!event) continue;
      const email = (r.email || '').toLowerCase().trim();
      const key = `${String(event._id)}_${email || String(r._id)}`;

      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          id: r._id,
          studentName: r.studentName || 'Student',
          studentEmail: r.email || '',
          rollNumber: r.rollNumber || '',
          department: r.department || '',
          year: r.yearOfStudy || r.year || '',
          eventId: event.eventId,
          eventTitle: event.title,
          eventDate: event.date,
          eventCategory: event.category,
          registeredAt: r.registeredAt || r.createdAt || new Date(),
          status: 'REGISTERED',
        });
      }
    }

    // 3. Process GoogleFormRegistration collection
    for (const rawR of formRegs) {
      const r = rawR as any;
      const event = r.eventId as any;
      if (!event) continue;
      const email = (r.email || '').toLowerCase().trim();
      const key = `${String(event._id)}_${email || String(r._id)}`;

      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          id: r._id,
          studentName: r.name || 'Form Registrant',
          studentEmail: r.email || '',
          rollNumber: r.rollNumber || '',
          department: r.department || '',
          year: r.year || '',
          eventId: event.eventId,
          eventTitle: event.title,
          eventDate: event.date,
          eventCategory: event.category,
          registeredAt: r.submittedAt || r.createdAt || new Date(),
          status: 'REGISTERED',
        });
      }
    }

    const registrationsList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );

    res.json({
      success: true,
      registrations: registrationsList,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/attended  (admin — attendance records per event, consolidated)
export async function adminListAttended(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.query;

    let targetEventObjectId: any = null;
    if (eventId) {
      const event = await EventModel.findOne({ $or: [{ eventId }, { _id: eventId }] }).lean();
      if (event) targetEventObjectId = event._id;
    }

    const attFilter: Record<string, unknown> = { status: 'PRESENT' };
    const eventRegFilter: Record<string, unknown> = {
      $or: [{ attendanceStatus: 'attended' }, { attendanceStatus: 'PRESENT' }],
    };

    if (targetEventObjectId) {
      attFilter.eventId = targetEventObjectId;
      eventRegFilter.eventId = targetEventObjectId;
    }

    const [attRecords, eventRegs] = await Promise.all([
      Attendance.find(attFilter)
        .populate('studentId', 'name email rollNumber department year')
        .populate('eventId', 'eventId title date category')
        .sort({ markedAt: -1 })
        .limit(500)
        .lean(),
      EventRegistration.find(eventRegFilter)
        .populate('eventId', 'eventId title date category')
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean(),
    ]);

    const combinedMap = new Map<string, any>();

    // 1. Process Attendance collection
    for (const rawR of attRecords) {
      const r = rawR as any;
      const student = r.studentId as any;
      const event = r.eventId as any;
      if (!event) continue;
      const email = student?.email ? student.email.toLowerCase().trim() : '';
      const key = `${String(event._id)}_${email || String(r._id)}`;

      combinedMap.set(key, {
        id: r._id,
        studentName: student?.name || 'Attended Student',
        studentEmail: student?.email || '',
        rollNumber: student?.rollNumber || '',
        department: student?.department || '',
        year: student?.year || '',
        eventId: event.eventId,
        eventTitle: event.title,
        eventDate: event.date,
        eventCategory: event.category,
        method: r.method || 'MANUAL',
        markedAt: r.markedAt || r.createdAt || new Date(),
      });
    }

    // 2. Process EventRegistration collection (where attendanceStatus === 'attended' or 'PRESENT')
    for (const rawR of eventRegs) {
      const r = rawR as any;
      const event = r.eventId as any;
      if (!event) continue;
      const email = (r.email || '').toLowerCase().trim();
      const key = `${String(event._id)}_${email || String(r._id)}`;

      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          id: r._id,
          studentName: r.studentName || 'Student',
          studentEmail: r.email || '',
          rollNumber: r.rollNumber || '',
          department: r.department || '',
          year: r.yearOfStudy || r.year || '',
          eventId: event.eventId,
          eventTitle: event.title,
          eventDate: event.date,
          eventCategory: event.category,
          method: 'MANUAL',
          markedAt: r.updatedAt || r.registeredAt || r.createdAt || new Date(),
        });
      }
    }

    const recordsList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );

    res.json({
      success: true,
      records: recordsList,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/registrations/clear-all  (admin — purge all registration data completely)
export async function clearAllRegistrationsData(req: any, res: Response) {
  try {
    await connectDB();
    const [regRes, eventRegRes, formRegRes] = await Promise.all([
      Registration.deleteMany({}),
      EventRegistration.deleteMany({}),
      GoogleFormRegistration.deleteMany({}),
    ]);

    res.json({
      success: true,
      message: `All student registration records cleaned completely (${regRes.deletedCount + eventRegRes.deletedCount + formRegRes.deletedCount} records purged).`,
      deletedCounts: {
        registrations: regRes.deletedCount,
        eventRegistrations: eventRegRes.deletedCount,
        formRegistrations: formRegRes.deletedCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
