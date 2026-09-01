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
 * The ONE canonical production URL for the public-facing GDGoC GCEE site.
 * Used as the final fallback when no environment variable overrides it.
 * All certificate verification links, QR codes, and email buttons are built
 * from this URL — it must always point to the official production deployment.
 */
const CANONICAL_PRODUCTION_URL = 'https://gdgoc-gcee.vercel.app';

/**
 * Get the public canonical URL of the application.
 *
 * Priority (highest → lowest):
 *   1. PUBLIC_APP_URL  — explicit override, takes precedence over everything
 *   2. NEXT_PUBLIC_APP_URL / VITE_APP_URL — framework-specific explicit vars
 *   3. APP_URL / CLIENT_URL — generic explicit vars
 *   4. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — Vercel system-injected vars
 *      (lowest explicit priority because Vercel injects the *internal* project
 *       hostname, e.g. gdgoc-gcee-clubs.vercel.app, which may differ from the
 *       real custom/production domain)
 *   5. Hard-coded CANONICAL_PRODUCTION_URL when NODE_ENV=production or VERCEL=1
 *
 * In production / Vercel, never returns localhost so emails always have valid links.
 */
export function getPublicAppUrl(): string {
  const candidates = [
    // Highest priority: explicit canonical override (set this in Vercel dashboard)
    process.env.PUBLIC_APP_URL,
    // Framework-specific explicit vars
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VITE_APP_URL,
    // Generic explicit vars
    process.env.APP_URL,
    process.env.CLIENT_URL,
    // Vercel system-injected vars — lowest explicit priority because
    // VERCEL_PROJECT_PRODUCTION_URL reflects the Vercel *project name* hostname
    // (e.g. gdgoc-gcee-clubs.vercel.app) rather than the custom/real domain.
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
    return CANONICAL_PRODUCTION_URL;
  }

  // Local development fallback
  const devCandidate = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return devCandidate.trim().replace(/\/+$/, '');
}

/**
 * The one true canonical URL for certificate links in emails.
 * Reads PUBLIC_APP_URL first, then falls back to CANONICAL_PRODUCTION_URL.
 * Use this (not getPublicAppUrl()) when building certificate verification
 * and download URLs so they always resolve to the correct production domain.
 */
export function getCertificateBaseUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.CLIENT_URL;
  if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
    return explicit.trim().replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return CANONICAL_PRODUCTION_URL;
  }
  return process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
}

/**
 * The ONE canonical registration link used by the REGISTER NOW button in every
 * event/announcement email. Always an absolute HTTPS URL so it works from Gmail.
 * Event-specific registrationLink fields are intentionally ignored for emails;
 * the button always opens the official event page below.
 */
export const EMAIL_REGISTRATION_URL = 'https://gdgoc-gcee.vercel.app/events/EV-2026-0001';

/**
 * The ONE official email address of the website.
 * Used as the sender/from/reply-to for every website email and displayed
 * anywhere the site shows a contact email. Override with SITE_EMAIL.
 */
export const SITE_EMAIL = (process.env.SITE_EMAIL || 'gceegdgoc@gmail.com').trim().toLowerCase();

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
  siteEmail: SITE_EMAIL,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@gdgocgcee.in',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  adminName: process.env.ADMIN_NAME || 'GDGoC GCEE Admin',
  gmail: {
    user: (process.env.GMAIL_USER || SITE_EMAIL).trim().toLowerCase(),
    appPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: (process.env.RESEND_FROM_EMAIL || SITE_EMAIL).trim().toLowerCase(),
  resendFromName: process.env.RESEND_FROM_NAME || 'GDGoC GCEE',
  // Where Contact Us (Resend) notifications are delivered.
  contactRecipientEmail: (process.env.CONTACT_RECIPIENT_EMAIL || SITE_EMAIL).trim().toLowerCase(),
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
