import { Resend } from 'resend';
import { env } from '../../config/env';

/**
 * Central server-side Resend transport.
 *
 * This is the ONLY module that touches the Resend SDK / REST API.
 * Credentials are read from environment variables (RESEND_API_KEY,
 * RESEND_FROM_EMAIL, RESEND_FROM_NAME) and never leave the server.
 *
 * Resend requires the sender's domain to be verified before it will
 * deliver to arbitrary recipients. When the domain is not verified yet,
 * `isResendSenderReady()` returns false so callers can fall back to the
 * secondary transport instead of failing every send.
 */

export interface ResendSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface ResendSendResult {
  success: boolean;
  id?: string;
  /** Safe, user-facing error message (never contains credentials). */
  error?: string;
  /** True when the failure was caused by an unverified/invalid sender domain. */
  senderNotVerified?: boolean;
}

let resendClient: Resend | null = null;

function getApiKey(): string {
  return (process.env.RESEND_API_KEY || env.resendApiKey || '').trim();
}

export function getResendFromEmail(): string {
  return (process.env.RESEND_FROM_EMAIL || env.resendFromEmail || '').trim().toLowerCase();
}

export function getResendFromName(): string {
  return (process.env.RESEND_FROM_NAME || env.resendFromName || 'GDGoC GCEE').trim();
}

/** RFC-5322 friendly From header, e.g. `GDGoC GCEE <noreply@gdgocgcee.in>`. */
export function getResendFromAddress(): string {
  return `${getResendFromName()} <${getResendFromEmail()}>`;
}

export function isResendConfigured(): boolean {
  const apiKey = getApiKey();
  const fromEmail = getResendFromEmail();
  if (!apiKey || !fromEmail) return false;
  // The sandbox address can only deliver to the account owner and must not
  // be used as the website's transactional sender.
  if (fromEmail.endsWith('@resend.dev')) return false;
  return true;
}

// ── Cached domain verification probe ─────────────────────────────────
// Avoids paying a failed API round-trip on every send when the domain is
// known to be unverified. Refreshed at most every DOMAIN_PROBE_TTL_MS.

const DOMAIN_PROBE_TTL_MS = 10 * 60 * 1000;
let domainProbeCache: { ready: boolean; checkedAt: number } | null = null;

/**
 * Returns true when the configured From domain is verified on the Resend
 * account (i.e. Resend will actually deliver to external recipients).
 * Result is cached for DOMAIN_PROBE_TTL_MS.
 */
export async function isResendSenderReady(): Promise<boolean> {
  if (!isResendConfigured()) return false;

  const now = Date.now();
  if (domainProbeCache && now - domainProbeCache.checkedAt < DOMAIN_PROBE_TTL_MS) {
    return domainProbeCache.ready;
  }

  const domain = getResendFromEmail().split('@')[1] || '';
  let ready = false;
  try {
    const client = getClient();
    const { data, error } = await client.domains.list();
    if (!error && Array.isArray(data)) {
      ready = data.some(
        // `name` is the domain, `status` is "verified" once DNS checks pass.
        (d: any) => String(d?.name || '').toLowerCase() === domain &&
          String(d?.status || '').toLowerCase() === 'verified'
      );
    }
  } catch (err: any) {
    console.error('[resend] Domain probe failed:', err?.message);
    ready = false;
  }

  if (!ready) {
    console.warn(
      `[resend] Sender domain "${domain}" is NOT verified on the Resend account. ` +
      'Add and verify it at https://resend.com/domains to enable Resend delivery.'
    );
  }

  domainProbeCache = { ready, checkedAt: now };
  return ready;
}

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getApiKey());
  }
  return resendClient;
}

/** Force re-probe on next call (used after configuration changes / tests). */
export function resetResendProbe(): void {
  domainProbeCache = null;
}

/**
 * Send an email through the Resend REST API (server-side only).
 * Never throws — always resolves to a safe result object.
 */
export async function sendViaResend(opts: ResendSendOptions): Promise<ResendSendResult> {
  if (!isResendConfigured()) {
    return { success: false, error: 'Resend is not configured on the server.' };
  }

  const cleanTo = (opts.to || '').trim().toLowerCase();

  try {
    const client = getClient();
    const { data, error } = await client.emails.send({
      from: getResendFromAddress(),
      to: [cleanTo],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo || undefined,
    });

    if (error) {
      // Log technical detail server-side only; expose a safe message.
      console.error('[resend] API error:', {
        name: error.name,
        message: error.message,
        to: cleanTo,
      });
      const senderNotVerified = /not verified|domain/i.test(error.message || '');
      return {
        success: false,
        error: senderNotVerified
          ? 'Email sender domain is not verified for the email service.'
          : 'Unable to send the email right now. Please try again.',
        senderNotVerified,
      };
    }

    return { success: true, id: data?.id || undefined };
  } catch (err: any) {
    console.error('[resend] Send failed:', err?.message);
    return { success: false, error: 'Unable to send the email right now. Please try again.' };
  }
}
