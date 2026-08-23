import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtp, verifyOtp } from '../controllers/auth.controller';

const router = Router();

// Prevent OTP spam: max 5 OTP requests / resend attempts per IP per 15 minutes.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait a few minutes and try again.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please wait and try again.' },
});

// Student community signup flow (aliases of /api/auth/* so the signup
// endpoints are self-documenting: /api/register/send-otp, /api/register/verify-otp).
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);

export default router;