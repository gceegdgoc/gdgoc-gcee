import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me, updateProfile, changePassword, sendOtp, verifyOtp } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';

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

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.get('/me', protect, me);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;
