import type { Response } from 'express';
import { GoogleFormRegistration } from '../models';
import { connectDB } from '../config/db';

// GET /api/admin/form-registrations
export async function adminListFormRegistrations(req: any, res: Response) {
  try {
    await connectDB();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      GoogleFormRegistration.find().sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      GoogleFormRegistration.countDocuments(),
      GoogleFormRegistration.countDocuments({ isRead: false }),
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
        isRead: r.isRead,
        submittedAt: r.submittedAt,
        createdAt: r.createdAt,
      })),
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/form-registrations/:id
export async function adminGetFormRegistration(req: any, res: Response) {
  try {
    await connectDB();
    const item = await GoogleFormRegistration.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }
    res.json({ success: true, registration: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/form-registrations/:id/read
export async function adminMarkFormRegistrationRead(req: any, res: Response) {
  try {
    await connectDB();
    const item = await GoogleFormRegistration.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    ).lean();
    if (!item) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }

    res.json({ success: true, registration: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
