import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import {
  isGmailConfigured,
  verifyGmailConnection,
  sendGmailEmail,
  sendContactUsNotification,
} from '../services/emailService';

/**
 * DEVELOPMENT-ONLY email testing endpoints.
 *
 * This router is mounted ONLY when NODE_ENV !== 'production' (see app.ts),
 * so it can never be publicly accessible in production.
 *
 * If EMAIL_TEST_SECRET is set, requests must additionally send the header
 *   x-test-token: <EMAIL_TEST_SECRET>
 *
 * POST /api/dev/test-email
 *   body: { "suite": "gmail" | "contact" | "all", "to": "someone@example.com" }
 */
const router = Router();

const devTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function authorize(req: Request, res: Response): boolean {
  if (env.emailTestSecret && req.get('x-test-token') !== env.emailTestSecret) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return false;
  }
  return true;
}

router.post('/test-email', devTestLimiter, async (req: Request, res: Response) => {
  if (!authorize(req, res)) return;

  const suite = String((req.body as any)?.suite || 'all');
  const rawTo = String((req.body as any)?.to || '').trim().toLowerCase();
  const to = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawTo) ? rawTo : env.gmail.user || env.adminEmail;

  const results: Record<string, any> = {};

  // ── TEST A: Normal website email → Nodemailer → Gmail SMTP ──────────
  if (suite === 'gmail' || suite === 'all') {
    const auth = await verifyGmailConnection();
    let sendResult: { success: boolean; id?: string; error?: string } = {
      success: false,
      error: 'Skipped because SMTP verification failed.',
    };
    if (auth.ok) {
      sendResult = await sendGmailEmail({
        to,
        subject: '[GDGoC GCEE] Gmail SMTP Test A — Nodemailer connection OK',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
            <div style="background:#0b1b33;padding:18px 24px;border-radius:12px 12px 0 0;color:#fff;">
              <h2 style="margin:0;font-size:18px;">GDGoC GCEE — Test A</h2>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
              <p style="margin-top:0;color:#374151;">Gmail SMTP (Nodemailer) is working correctly.</p>
              <p style="color:#64748b;font-size:13px;">Sent at ${new Date().toISOString()} to ${to}.</p>
            </div>
          </div>`,
        text: 'GDGoC GCEE — Test A: Gmail SMTP (Nodemailer) is working correctly.',
      });
    }
    results.testA_gmailSmtp = {
      provider: 'Nodemailer → Gmail SMTP',
      smtpAuthVerified: auth.ok,
      authError: auth.error,
      sent: sendResult.success,
      messageId: sendResult.id,
      error: sendResult.error,
    };
  }

  // ── TEST B: Contact Us form flow → Centralized Gmail SMTP ────────────
  if (suite === 'contact' || suite === 'all') {
    const configured = isGmailConfigured();
    let sendResult: { success: boolean; id?: string; error?: string } = {
      success: false,
      error: configured ? undefined : 'Gmail SMTP is not configured.',
    };
    if (configured) {
      sendResult = await sendContactUsNotification({
        name: 'Dev Test (Contact Us)',
        email: to,
        subject: 'Dev Test B — Contact form flow',
        message:
          'This is an automated development test of the Contact Us flow. Reply-To should be set to this test address.',
        phone: '+91 90000 00000',
        submittedAt: new Date(),
      });
    }
    results.testB_contact = {
      provider: 'Nodemailer → Gmail SMTP',
      recipient: 'gceegdgoc@gmail.com',
      replyTo: to,
      configured,
      sent: sendResult.success,
      messageId: sendResult.id,
      error: sendResult.error,
    };
  }

  res.json({ success: true, environment: env.nodeEnv, results });
});

export default router;
