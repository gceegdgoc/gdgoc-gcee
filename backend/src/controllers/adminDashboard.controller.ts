import type { Response } from 'express';
import { Registration, Attendance, EventModel } from '../models';
import { connectDB } from '../config/db';

// GET /api/admin/registrations  (admin — registered students per event)
export async function adminListRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.query;
    const filter: Record<string, unknown> = { status: 'REGISTERED' };
    if (eventId) {
      const event = await EventModel.findOne({ eventId });
      if (event) filter.eventId = event._id;
    }

    const registrations = await Registration.find(filter)
      .populate('studentId', 'name email rollNumber department year phone')
      .populate('eventId', 'eventId title date category')
      .sort({ registeredAt: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      registrations: registrations
        .filter((r) => r.studentId && r.eventId)
        .map((r) => {
          const student = r.studentId as any;
          const event = r.eventId as any;
          return {
            id: r._id,
            studentName: student.name,
            studentEmail: student.email,
            rollNumber: student.rollNumber,
            department: student.department,
            year: student.year,
            eventId: event.eventId,
            eventTitle: event.title,
            eventDate: event.date,
            eventCategory: event.category,
            registeredAt: r.registeredAt,
            status: r.status,
          };
        }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/attended  (admin — attendance records per event)
export async function adminListAttended(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.query;
    const filter: Record<string, unknown> = { status: 'PRESENT' };
    if (eventId) {
      const event = await EventModel.findOne({ eventId });
      if (event) filter.eventId = event._id;
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name email rollNumber department year')
      .populate('eventId', 'eventId title date category')
      .sort({ markedAt: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      records: records
        .filter((r) => r.studentId && r.eventId)
        .map((r) => {
          const student = r.studentId as any;
          const event = r.eventId as any;
          return {
            id: r._id,
            studentName: student.name,
            studentEmail: student.email,
            rollNumber: student.rollNumber,
            department: student.department,
            year: student.year,
            eventId: event.eventId,
            eventTitle: event.title,
            eventDate: event.date,
            eventCategory: event.category,
            method: r.method,
            markedAt: r.markedAt,
          };
        }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
