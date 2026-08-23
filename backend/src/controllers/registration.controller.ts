import type { Request, Response } from 'express';
import { GoogleFormRegistration, EventModel, Registration, EventRegistration } from '../models';
import { connectDB } from '../config/db';

function extractField(data: Record<string, any>, keys: string[]): string {
  for (const search of keys) {
    const match = Object.keys(data).find((k) => k.toLowerCase().includes(search.toLowerCase()));
    if (match) {
      const val = data[match];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}

function normalizePayload(body: any): Record<string, any> | null {
  if (!body || (typeof body !== 'object' && typeof body !== 'string')) return null;
  if (body.formData && typeof body.formData === 'object') return body.formData;
  if (typeof body === 'object') return body;
  return null;
}

// POST /api/registrations/webhook/:eventId
export async function eventWebhook(req: Request, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: `Event not found: ${eventId}` });
      return;
    }

    const formData = normalizePayload(req.body);
    if (!formData) {
      res.status(400).json({ success: false, message: 'Invalid payload.' });
      return;
    }

    const responseId = req.body.responseId || formData['Response ID'] || formData['responseId'] || null;
    const name = extractField(formData, ['full name', 'name', 'student name']);
    const email = extractField(formData, ['email', 'e-mail']);
    const phone = extractField(formData, ['phone', 'mobile', 'contact', 'whatsapp']);
    const rollNumber = extractField(formData, ['register', 'roll', 'reg no', 'roll no', 'roll number']);
    const department = extractField(formData, ['department', 'dept', 'branch']);
    const year = extractField(formData, ['year', 'semester', 'study year']);
    const college = extractField(formData, ['college', 'institution', 'university']);

    if (!name && !email) {
      res.status(400).json({ success: false, message: 'Name or email is required.' });
      return;
    }

    if (responseId) {
      const existing = await GoogleFormRegistration.findOne({ responseId }).lean();
      if (existing) {
        res.json({ success: true, message: 'Already recorded.', duplicate: true });
        return;
      }
    }

    const registration = await GoogleFormRegistration.create({
      responseId: responseId || undefined,
      eventId: event._id,
      formData,
      name,
      email: email ? email.toLowerCase() : '',
      phone,
      rollNumber,
      department,
      year,
      college,
      source: 'webhook',
      submittedAt: new Date(),
    });

    console.log(`[webhook] Event registration saved: ${name} (${email}) for event ${eventId} — id=${registration._id}`);
    res.json({ success: true, message: 'Registration saved.', id: String(registration._id) });
  } catch (err: any) {
    if (err.code === 11000) {
      res.json({ success: true, message: 'Already recorded.', duplicate: true });
      return;
    }
    console.error('[webhook] Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/admin/events/:eventId/registrations
export async function listEventRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim().toLowerCase();

    const filter: Record<string, any> = { eventId: event._id };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      GoogleFormRegistration.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      GoogleFormRegistration.countDocuments(filter),
    ]);

    res.json({
      success: true,
      registrations: items.map((r) => ({
        _id: r._id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        rollNumber: r.rollNumber,
        department: r.department,
        year: r.year,
        college: r.college,
        source: r.source,
        submittedAt: r.submittedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      eventTitle: event.title,
      eventDate: event.date,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events/:eventId/registration-count
export async function eventRegistrationCount(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const count = await GoogleFormRegistration.countDocuments({ eventId: event._id });
    res.json({
      success: true,
      count,
      capacity: event.capacity || 0,
      registrationEnabled: event.registrationEnabled,
      lastSyncedAt: event.lastSyncedAt,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events/:eventId/registrations/export
export async function exportEventRegistrationsAsCsv(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const items = await GoogleFormRegistration.find({ eventId: event._id }).sort({ submittedAt: -1 }).lean();

    const header = '#,Name,Email,Phone,College,Department,Year,Event,Source,Registered At\n';
    const rows = items.map((r, i) => {
      const d = r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
      return `${i + 1},"${(r.name || '').replace(/"/g, '""')}","${r.email || ''}","${r.phone || ''}","${(r.college || '').replace(/"/g, '""')}","${r.department || ''}","${r.year || ''}","${event.title}","${r.source || 'webhook'}","${d}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${eventId}-registrations.csv"`);
    res.send(header + rows);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/events/:eventId/registrations/bulk
export async function bulkAddRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const { registrations } = req.body;
    if (!Array.isArray(registrations) || registrations.length === 0) {
      res.status(400).json({ success: false, message: 'Provide a registrations array.' });
      return;
    }

    let added = 0;
    let skipped = 0;

    for (const r of registrations) {
      const email = (r.email || '').toLowerCase().trim();
      if (!email && !r.name) { skipped++; continue; }

      const responseId = r.responseId || `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const existing = await GoogleFormRegistration.findOne({ responseId }).lean();
      if (existing) { skipped++; continue; }

      if (email) {
        const emailDupe = await GoogleFormRegistration.findOne({ eventId: event._id, email }).lean();
        if (emailDupe) { skipped++; continue; }
      }

      await GoogleFormRegistration.create({
        responseId,
        eventId: event._id,
        formData: r,
        name: r.name || '',
        email,
        phone: r.phone || '',
        rollNumber: r.rollNumber || '',
        department: r.department || '',
        year: r.year || '',
        college: r.college || '',
        source: 'sheets-sync',
        submittedAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
      });
      added++;
    }

    await EventModel.findOneAndUpdate({ eventId }, { lastSyncedAt: new Date() });

    res.json({ success: true, message: `Synced ${added} registration(s). ${skipped} duplicate(s) skipped.`, added, skipped });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/events-with-registrations
export async function listEventsWithRegistrationCounts(req: any, res: Response) {
  try {
    await connectDB();

    const events = await EventModel.find().sort({ date: -1 }).lean();

    const eventIds = events.map((e) => e._id);
    const counts = await GoogleFormRegistration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    res.json({
      success: true,
      events: events.map((e) => ({
        eventId: e.eventId,
        title: e.title,
        date: e.date,
        category: e.category,
        capacity: e.capacity || 0,
        registrationEnabled: e.registrationEnabled,
        googleFormUrl: e.googleFormUrl || '',
        responseSheetId: e.responseSheetId || '',
        lastSyncedAt: e.lastSyncedAt,
        registrationCount: countMap.get(String(e._id)) || 0,
        status: e.status,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/registration-stats
export async function getRegistrationStats(_req: any, res: Response) {
  try {
    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [totalRegistrations, todayRegistrations, weekRegistrations, totalEvents, eventsWithForms] = await Promise.all([
      GoogleFormRegistration.countDocuments(),
      GoogleFormRegistration.countDocuments({ submittedAt: { $gte: todayStart } }),
      GoogleFormRegistration.countDocuments({ submittedAt: { $gte: weekStart } }),
      EventModel.countDocuments(),
      EventModel.countDocuments({ googleFormUrl: { $ne: '' } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalRegistrations,
        todayRegistrations,
        weekRegistrations,
        totalEvents,
        eventsWithForms,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/events/:eventId/registrations/:registrationId
export async function deleteEventRegistration(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId, registrationId } = req.params;

    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const deletedForm = await GoogleFormRegistration.findOneAndDelete({
      _id: registrationId,
      eventId: event._id,
    });

    const deletedReg = await Registration.findOneAndDelete({
      _id: registrationId,
      eventId: event._id,
    });

    const deletedEventReg = await EventRegistration.findOneAndDelete({
      _id: registrationId,
      eventId: event._id,
    });

    if (!deletedForm && !deletedReg && !deletedEventReg) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }

    const formCount = await GoogleFormRegistration.countDocuments({ eventId: event._id });
    const regCount = await Registration.countDocuments({ eventId: event._id, status: 'REGISTERED' });
    const totalCount = formCount + regCount;

    res.json({ success: true, message: 'Registration deleted successfully.', remainingCount: totalCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/events/:eventId/registrations/clear
export async function clearEventRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;

    const event = await EventModel.findOne({ eventId });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    await Promise.all([
      GoogleFormRegistration.deleteMany({ eventId: event._id }),
      Registration.deleteMany({ eventId: event._id }),
      EventRegistration.deleteMany({ eventId: event._id }),
    ]);

    event.manualRegistrationCount = 0;
    await event.save();

    res.json({ success: true, message: 'All registrations for this event have been cleared.', remainingCount: 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
