import { CLUB } from '../config/env';

const TZ = CLUB.timezone;

function toPadded(n: number): string {
  return String(n).padStart(2, '0');
}

/** Return the calendar date string (YYYY-MM-DD) in Asia/Kolkata. */
export function todayIST(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Current time HH:mm in Asia/Kolkata. */
export function nowISTTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')}`;
}

/**
 * Returns current minutes from midnight in Asia/Kolkata timezone (0..1439).
 */
export function nowISTMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const hour = parseInt(get('hour'), 10) || 0;
  const minute = parseInt(get('minute'), 10) || 0;
  return hour * 60 + minute;
}

/**
 * Parses time strings like "10:00 AM", "4:00 PM", "16:00", "09:30" into minutes from midnight (0..1439).
 * Returns null if invalid or cannot be parsed.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const t = timeStr.trim();
  if (!t) return null;

  // Check 12-hour format with AM/PM (e.g. "10:00 AM", "4:30 pm", "12:00 PM")
  const match12 = t.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // Check 24-hour format (e.g. "16:00", "09:30", "17:00:00")
  const match24 = t.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return null;
}

/**
 * Centralized function to determine the real-time lifecycle status of an event in Asia/Kolkata:
 * 1. 'CANCELLED' if explicitly cancelled.
 * 2. 'COMPLETED' if explicitly marked completed OR if event date/end time has passed.
 * 3. 'ONGOING' (Live / Ongoing) if today is the event date and current time is between start and end times.
 * 4. 'UPCOMING' if event date/start time is in the future.
 */
export function getEffectiveEventStatus(event?: {
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}): 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' {
  if (!event) return 'UPCOMING';
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'COMPLETED') return 'COMPLETED';

  const eventDateISO = normalizeDateToISO(event.date);
  if (!eventDateISO) return 'UPCOMING';

  const today = todayIST();

  if (today > eventDateISO) {
    return 'COMPLETED';
  }

  if (today < eventDateISO) {
    return 'UPCOMING';
  }

  // Today is the event date! Check start & end times in IST
  const currentMinutes = nowISTMinutes();
  const startMinutes = parseTimeToMinutes(event.startTime) ?? 0;
  const endMinutes = parseTimeToMinutes(event.endTime) ?? (23 * 60 + 59);

  if (currentMinutes > endMinutes) {
    return 'COMPLETED';
  }

  if (currentMinutes >= startMinutes) {
    return 'ONGOING';
  }

  return 'UPCOMING';
}

export function isISTToday(dateStr: string): boolean {
  return normalizeDateToISO(dateStr) === todayIST();
}

/**
 * Normalizes any date string (YYYY-MM-DD, DD-MM-YYYY, ISO) to standard YYYY-MM-DD.
 * Returns empty string if invalid or missing.
 */
export function normalizeDateToISO(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback Date parser using Asia/Kolkata
  try {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const year = get('year');
      const month = get('month');
      const day = get('day');
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    }
  } catch {
    // ignore
  }

  return '';
}

export function normalizeDate(dateStr: string): string {
  return normalizeDateToISO(dateStr) || (dateStr ? dateStr.slice(0, 10) : '');
}

/**
 * Checks if registration for an event is currently open.
 * Rule:
 * 1. Event must have registrationEnabled !== false.
 * 2. Event status must not be COMPLETED or CANCELLED.
 * 3. The event date is the final deadline date: registration automatically closes at 00:00:00 IST on the event date (1 day before event date ends).
 *    Therefore, registration is only open when current IST date < eventDate (i.e. strictly before event date).
 * 4. If an explicit registrationDeadline is configured, current IST date must also be < registrationDeadline.
 */
export function isEventRegistrationOpen(event: {
  date?: string;
  registrationDeadline?: string;
  registrationEnabled?: boolean;
  status?: string;
}): boolean {
  if (!event) return false;
  if (event.registrationEnabled === false) return false;
  if (event.status === 'COMPLETED' || event.status === 'CANCELLED') return false;

  const eventDateISO = normalizeDateToISO(event.date);
  if (!eventDateISO) return false;

  const today = todayIST();

  // Registration closes from 00:00:00 IST on the event date
  // So if today in IST is >= eventDateISO, registration is CLOSED.
  if (today >= eventDateISO) {
    return false;
  }

  // If custom registrationDeadline is specified and earlier than event date
  if (event.registrationDeadline) {
    const deadlineISO = normalizeDateToISO(event.registrationDeadline);
    if (deadlineISO && today >= deadlineISO) {
      return false;
    }
  }

  return true;
}

/** Convert YYYY-MM-DD to DD.MM.YYYY */
export function formatDotDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = normalizeDate(dateStr).split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y}`;
}

/** Convert YYYY-MM-DD to "18 August 2026" */
export function formatFullDate(dateStr: string): string {
  const iso = normalizeDate(dateStr);
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Convert YYYY-MM-DD to a human readable label e.g. "20 Aug 2026" */
export function formatHumanDate(dateStr: string): string {
  const iso = normalizeDate(dateStr);
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatHumanDateTime(dateStr: string, time = ''): string {
  const label = formatHumanDate(dateStr);
  if (!time) return label;
  return `${label} · ${time}`;
}

export function isDateBefore(a: string, b: string): boolean {
  return normalizeDate(a) < normalizeDate(b);
}

export function isDateAfter(a: string, b: string): boolean {
  return normalizeDate(a) > normalizeDate(b);
}

/**
 * Convert a time string to 12-hour display, e.g. "09:00" -> "9:00 AM",
 * "17:00" -> "5:00 PM", and leaves already-formatted times like "10:00 AM" untouched.
 */
export function formatTime12h(timeStr: string): string {
  const t = (timeStr || '').trim();
  if (!t) return '';

  const explicit = t.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
  if (explicit) {
    const h = parseInt(explicit[1], 10);
    const min = explicit[2];
    const period = explicit[3].toUpperCase();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${min} ${period}`;
  }

  const numeric = t.match(/^(\d{1,2})[:.](\d{2})(:\d{2})?$/);
  if (numeric) {
    const h = parseInt(numeric[1], 10);
    const min = numeric[2];
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${min} ${period}`;
  }

  return t;
}

/** Format a start/end time pair for emails and UI, e.g. "10:00 AM" or "10:00 AM - 5:00 PM". */
export function formatTimeRange(start?: string, end?: string): string {
  const s = start ? formatTime12h(start) : '';
  const e = end ? formatTime12h(end) : '';
  if (s && e) return `${s} - ${e}`;
  return s || e || 'TBA';
}
