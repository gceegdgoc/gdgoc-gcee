import dotenv from 'dotenv';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

// Robust environment loading across root, backend, or nested directories
for (const candidate of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), 'backend', '.env.local'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env.local'),
]) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: true });
  }
}

// Workaround for environments whose system DNS server refuses SRV queries
// (Node's c-ares resolver gets ECONNREFUSED -> Mongo "querySrv ECONNREFUSED").
// Set FORCE_DNS to a comma-separated list of working nameservers (e.g. 8.8.8.8).
// Left unset in production (Vercel) so the platform resolver is used.
const forceDns = (process.env.FORCE_DNS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (forceDns.length > 0) {
  try {
    dns.setServers(forceDns);
    console.log(`[env] FORCE_DNS set: ${forceDns.join(', ')}`);
  } catch (err: any) {
    console.warn('[env] Failed to apply FORCE_DNS:', err.message);
  }
}

/**
 * Get the public canonical URL of the application.
 * In production / Vercel, never returns localhost so emails always have valid links.
 */
export function getPublicAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    process.env.CLIENT_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim() && !c.includes('localhost') && !c.includes('127.0.0.1')) {
      return c.trim().replace(/\/+$/, '');
    }
  }

  // When running in production or on Vercel, default to the official production URL
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return 'https://gdgoc-gcee-clubs.vercel.app';
  }

  // Local development fallback
  const devCandidate = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return devCandidate.trim().replace(/\/+$/, '');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gdgoc-gcee',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: getPublicAppUrl(),
  clientUrl: getPublicAppUrl(),
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@gdgocgcee.in',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  adminName: process.env.ADMIN_NAME || 'GDGoC GCEE Admin',
  gmail: {
    user: (process.env.GMAIL_USER || 'gceegdgoc@gmail.com').trim().toLowerCase(),
    appPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  resendFromName: process.env.RESEND_FROM_NAME || 'GDGoC GCEE',
  // Where Contact Us (Resend) notifications are delivered.
  contactRecipientEmail: (process.env.CONTACT_RECIPIENT_EMAIL || 'gceegdgoc@gmail.com').trim().toLowerCase(),
  googleFormWebhookSecret: process.env.GOOGLE_FORM_WEBHOOK_SECRET || '',
  emailTestSecret: process.env.EMAIL_TEST_SECRET || '',
};

export const CLUB = {
  name: 'GDGoC GCEE',
  fullName: 'Google Developer Groups on Campus — Government College of Engineering, Erode',
  shortName: 'GDGoC',
  organization: 'GDGoC GCEE',
  institution: 'Government College of Engineering, Erode',
  timezone: 'Asia/Kolkata',
  websiteName: 'GDGoC GCEE',
};
