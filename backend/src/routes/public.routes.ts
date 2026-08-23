import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicStats, contactForm, emailStatus } from '../controllers/public.controller';

const router = Router();

// Strict per-IP rate limit for the Contact Us form (bot/abuse protection).
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages sent. Please try again later.' },
});

router.get('/stats', publicStats);
router.get('/email-status', emailStatus);
router.post('/contact', contactLimiter, contactForm);

export default router;
