import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { Student } from '../models/Student';
import { env } from '../config/env';
import { signToken } from '../utils/jwt';
import type { AuthRequest } from '../middleware/auth';
import { connectDB, isDbConnectionError } from '../config/db';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.cookieSecure,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setAuthCookie(res: Response, token: string) {
  res.cookie('gdgoc_token', token, COOKIE_OPTS);
}

/**
 * Generate a cryptographically secure 6-digit OTP
 */
function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Securely hash OTP with bcrypt before storing
 */
function hashOtp(otp: string): string {
  return bcrypt.hashSync(otp, 10);
}

const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;    // 60 seconds cooldown
const MAX_OTP_ATTEMPTS = 5;              // Max 5 attempts per OTP

export function publicStudent(student: any) {
  return {
    id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    college: student.college,
    department: student.department,
    year: student.year,
    rollNumber: student.rollNumber,
    profileImage: student.profileImage,
    isVerified: student.isVerified || false,
    points: student.points,
    bio: student.bio,
    socialLinks: student.socialLinks,
    joinedAt: student.joinedAt,
  };
}

// POST /api/auth/register
export async function register(req: AuthRequest, res: Response) {
  try {
    await connectDB();
    console.log('[API] Registration request received');

    const { name, email, phone, rollNumber, department, year, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email and password are required.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRollNumber = (rollNumber || '').trim();

    // Check if an account with this email exists
    const existingStudent = await Student.findOne({ email: cleanEmail });
    if (existingStudent && existingStudent.isVerified) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
      return;
    }

    // Check resend cooldown for unverified accounts requesting another OTP
    if (existingStudent?.otpLastSentAt) {
      const timeSinceLastSent = Date.now() - new Date(existingStudent.otpLastSentAt).getTime();
      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
        res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds}s before requesting a new OTP.`,
          cooldownSeconds: waitSeconds,
        });
        return;
      }
    }

    if (!existingStudent && cleanRollNumber) {
      const existingRoll = await Student.findOne({ rollNumber: cleanRollNumber, isVerified: true });
      if (existingRoll) {
        res.status(409).json({
          success: false,
          message: 'This register number is already registered.',
        });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

    // Send OTP via Nodemailer / Gmail SMTP FIRST
    console.log(`[auth] Sending Join OTP email to: ${cleanEmail}`);
    const sendResult = await sendOTPEmail({
      to: cleanEmail,
      studentName: name.trim(),
      otp,
    });

    if (!sendResult.success) {
      console.error(`[auth] Verification email delivery failed for ${cleanEmail}:`, sendResult.error);
      res.status(500).json({
        success: false,
        message: sendResult.error || 'Unable to send OTP. Please check your email address and try again.',
      });
      return;
    }

    // Save student only after Gmail SMTP confirms acceptance
    let student: any;
    if (existingStudent) {
      // Registered previously but never completed verification: refresh details & OTP
      existingStudent.name = name.trim();
      existingStudent.phone = (phone || '').trim();
      existingStudent.rollNumber = cleanRollNumber;
      existingStudent.department = (department || '').trim();
      existingStudent.year = (year || '').trim();
      existingStudent.passwordHash = passwordHash;
      existingStudent.otp = otpHash;
      existingStudent.otpExpiresAt = otpExpiresAt;
      existingStudent.otpAttempts = 0;
      existingStudent.otpLastSentAt = new Date();
      student = await existingStudent.save();
    } else {
      student = await Student.create({
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || '').trim(),
        rollNumber: cleanRollNumber,
        department: (department || '').trim(),
        year: (year || '').trim(),
        college: 'Government College of Engineering, Erode',
        passwordHash,
        isVerified: false,
        otp: otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      });
    }

    console.log(`[API] Registration and OTP send successful for ${cleanEmail}`);

    const token = signToken({ id: String(student._id), role: 'student' });
    setAuthCookie(res, token);

    res.status(existingStudent ? 200 : 201).json({
      success: true,
      message: 'OTP sent successfully to your Gmail inbox.',
      token,
      student: publicStudent(student),
      requiresVerification: true,
    });
  } catch (err: any) {
    console.error('[auth] register error:', err.message);
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      res.status(409).json({
        success: false,
        message: field === 'rollNumber' ? 'This register number is already registered.' : 'An account with this email already exists. Please log in.',
      });
      return;
    }
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Registration failed due to a server error. Please try again.' });
  }
}

// POST /api/auth/send-otp
export async function sendOtp(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const student = await Student.findOne({ email: cleanEmail });
    if (!student) {
      res.status(404).json({ success: false, message: 'No account found with this email.' });
      return;
    }

    if (student.isVerified) {
      res.json({ success: true, message: 'Email is already verified. You can log in.' });
      return;
    }

    // Cooldown check (60 seconds)
    if (student.otpLastSentAt) {
      const timeSinceLastSent = Date.now() - new Date(student.otpLastSentAt).getTime();
      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
        res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds}s before requesting a new OTP.`,
          cooldownSeconds: waitSeconds,
        });
        return;
      }
    }

    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

    // Send new OTP via Nodemailer / Gmail SMTP
    const sendResult = await sendOTPEmail({
      to: student.email,
      studentName: student.name,
      otp,
    });

    if (!sendResult.success) {
      console.error(`[auth] Resend OTP email failed for ${cleanEmail}:`, sendResult.error);
      res.status(500).json({
        success: false,
        message: sendResult.error || 'Unable to send OTP. Please try again.',
      });
      return;
    }

    student.otp = otpHash;
    student.otpExpiresAt = otpExpiresAt;
    student.otpAttempts = 0;
    student.otpLastSentAt = new Date();
    await student.save();

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your Gmail.',
    });
  } catch (err: any) {
    console.error('[auth] sendOtp error:', err.message);
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Could not process the request. Please try again.' });
  }
}

// POST /api/auth/verify-otp
export async function verifyOtp(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const student = await Student.findOne({ email: cleanEmail });
    if (!student) {
      res.status(404).json({ success: false, message: 'No account found with this email.' });
      return;
    }

    if (student.isVerified) {
      const token = signToken({ id: String(student._id), role: 'student' });
      setAuthCookie(res, token);
      res.json({
        success: true,
        verified: true,
        message: 'Email is already verified.',
        token,
        student: publicStudent(student),
      });
      return;
    }

    if (!student.otp || !student.otpExpiresAt) {
      res.status(400).json({
        success: false,
        verified: false,
        message: 'No active OTP found. Please request a new OTP.',
      });
      return;
    }

    // Check expiration
    if (new Date() > new Date(student.otpExpiresAt)) {
      res.status(400).json({
        success: false,
        verified: false,
        message: 'OTP has expired. Please request a new OTP.',
      });
      return;
    }

    // Check maximum attempts limit
    if ((student.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      student.otp = null as any;
      student.otpExpiresAt = null as any;
      student.otpAttempts = 0;
      await student.save();

      res.status(400).json({
        success: false,
        verified: false,
        message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.',
      });
      return;
    }

    // Compare OTP securely with bcrypt
    const otpValid = await bcrypt.compare(cleanOtp, student.otp);
    if (!otpValid) {
      student.otpAttempts = (student.otpAttempts || 0) + 1;
      await student.save();

      const remaining = MAX_OTP_ATTEMPTS - student.otpAttempts;
      res.status(400).json({
        success: false,
        verified: false,
        message: remaining > 0
          ? `Invalid OTP. You have ${remaining} attempt(s) remaining.`
          : 'Invalid OTP. Maximum attempts exceeded.',
      });
      return;
    }

    // Atomic verify: mark verified and clean up OTP credentials
    const updated = await Student.findOneAndUpdate(
      { _id: student._id },
      {
        $set: { isVerified: true },
        $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1, otpLastSentAt: 1 },
      },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    // Send Welcome Email upon successful verification (non-blocking)
    if (updated.email) {
      sendWelcomeEmail({
        to: updated.email,
        studentName: updated.name,
        rollNumber: updated.rollNumber || undefined,
        department: updated.department || undefined,
        year: updated.year || undefined,
      }).catch((err) => {
        console.error('[auth] Welcome email delivery error:', err.message);
      });
    }

    // Generate token and automatically sign student in
    const token = signToken({ id: String(updated._id), role: 'student' });
    setAuthCookie(res, token);

    res.json({
      success: true,
      verified: true,
      message: 'Email verified successfully! Welcome to GDGoC GCEE.',
      token,
      student: publicStudent(updated),
    });
  } catch (err: any) {
    console.error('[auth] verifyOtp error:', err.message);
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Verification failed due to a server error. Please try again.' });
  }
}

// POST /api/auth/login
export async function login(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const identifier = String(email).trim().toLowerCase();
    const student = await Student.findOne({
      $or: [{ email: identifier }, { rollNumber: identifier.toUpperCase() }],
    });

    if (!student || !student.isActive) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const ok = await bcrypt.compare(String(password), student.passwordHash);
    if (!ok) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (!student.isVerified) {
      // Generate and send a fresh OTP immediately
      const otp = generateSecureOtp();
      student.otp = hashOtp(otp);
      student.otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);
      student.otpAttempts = 0;
      student.otpLastSentAt = new Date();
      await student.save();

      sendOTPEmail({
        to: student.email,
        studentName: student.name,
        otp,
      }).catch((err) => {
        console.error('[auth] Login unverified OTP send error:', err.message);
      });

      res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. An OTP has been sent to your email.',
        requiresVerification: true,
        email: student.email,
      });
      return;
    }

    const token = signToken({ id: String(student._id), role: 'student' });
    setAuthCookie(res, token);
    res.json({ success: true, message: 'Welcome back!', token, student: publicStudent(student) });
  } catch (err: any) {
    console.error('[auth] login error:', err.message);
    if (isDbConnectionError(err)) {
      res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Login failed due to a server error. Please try again.' });
  }
}

// POST /api/auth/logout
export async function logout(_req: AuthRequest, res: Response) {
  res.clearCookie('gdgoc_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
}

// GET /api/auth/me
export async function me(req: AuthRequest, res: Response) {
  try {
    await connectDB();
    const student = await Student.findById(req.studentId).lean();
    if (!student) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    res.json({ success: true, student: publicStudent(student) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/auth/profile
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const allowed = ['name', 'phone', 'department', 'year', 'rollNumber', 'bio', 'profileImage', 'socialLinks'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const student = await Student.findByIdAndUpdate(req.studentId, update, { new: true, runValidators: true }).lean();
    if (!student) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    res.json({ success: true, message: 'Profile updated.', student: publicStudent(student) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/auth/password
export async function changePassword(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }

    const student = await Student.findById(req.studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    const ok = await bcrypt.compare(currentPassword, student.passwordHash);
    if (!ok) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }
    student.passwordHash = await bcrypt.hash(newPassword, 10);
    await student.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
