import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { Student } from '../models/Student';
import { connectDB } from '../config/db';

export interface AuthRequest extends Request {
  studentId?: string;
  student?: InstanceType<typeof Student>;
  adminId?: string;
  admin?: InstanceType<typeof Student>;
}

/** Extract JWT from httpOnly cookie first, then Authorization header. */
function extractToken(req: Request): string | null {
  if (req.cookies?.gdgoc_token) return req.cookies.gdgoc_token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Protect a route for authenticated students. */
export async function protect(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await connectDB();

    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    const payload = verifyToken(token);
    if (payload.role !== 'student') {
      res.status(403).json({ success: false, message: 'Student access required.' });
      return;
    }

    const student = await Student.findById(payload.id).lean();
    if (!student || !student.isActive) {
      res.status(401).json({ success: false, message: 'Account not found or disabled.' });
      return;
    }

    req.studentId = String(student._id);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
  }
}
