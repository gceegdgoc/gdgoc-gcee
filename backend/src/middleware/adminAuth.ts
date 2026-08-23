import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { Admin } from '../models/Admin';
import { connectDB } from '../config/db';

/** Protect a route for authenticated admins. */
export async function adminProtect(req: Request, res: Response, next: NextFunction) {
  try {
    await connectDB();

    const token = req.cookies?.gdgoc_admin_token || (() => {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) return header.slice(7);
      return null;
    })();

    if (!token) {
      res.status(401).json({ success: false, message: 'Admin authentication required.' });
      return;
    }

    const payload = verifyToken(token);
    if (payload.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required.' });
      return;
    }

    const admin = await Admin.findById(payload.id).lean();
    if (!admin || !admin.isActive) {
      res.status(401).json({ success: false, message: 'Admin account not found or disabled.' });
      return;
    }

    (req as Request & { adminId?: string }).adminId = String(admin._id);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Admin session expired or invalid.' });
  }
}
