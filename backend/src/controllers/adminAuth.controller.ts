import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { Admin } from '../models/Admin';
import { env } from '../config/env';
import { signToken } from '../utils/jwt';
import { connectDB, isDbConnectionError } from '../config/db';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.cookieSecure,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export function publicAdmin(admin: any) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

// POST /api/admin/auth/login
export async function adminLogin(req: any, res: Response) {
  try {
    await connectDB();

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.isActive) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
      return;
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = signToken({ id: String(admin._id), role: 'admin' });
    res.cookie('gdgoc_admin_token', token, COOKIE_OPTS);
    res.json({ success: true, message: 'Admin login successful.', token, admin: publicAdmin(admin) });
  } catch (err: any) {
    console.error('[adminAuth] login error:', err.message);
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Login failed due to a server error. Please try again.' });
  }
}

// POST /api/admin/auth/logout
export async function adminLogout(_: any, res: Response) {
  res.clearCookie('gdgoc_admin_token', { path: '/' });
  res.json({ success: true, message: 'Admin logged out.' });
}

// GET /api/admin/auth/me
export async function adminMe(req: any, res: Response) {
  try {
    await connectDB();
    const admin = await Admin.findById(req.adminId).lean();
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found.' });
      return;
    }
    res.json({ success: true, admin: publicAdmin(admin) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/auth/password
export async function adminChangePassword(req: any, res: Response) {
  try {
    await connectDB();

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      return;
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found.' });
      return;
    }

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) {
      res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[adminAuth] changePassword error:', err.message);
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Could not update password due to a server error.' });
  }
}
