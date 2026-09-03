export function todayIST(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

export function normalizeDateToISO(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  try {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
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

/**
 * Returns current minutes from midnight in Asia/Kolkata timezone (0..1439).
 */
export function nowISTMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
    const hour = parseInt(get('hour'), 10) || 0;
    const minute = parseInt(get('minute'), 10) || 0;
    return hour * 60 + minute;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
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
  effectiveStatus?: string;
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

export function isEventRegistrationOpen(event?: {
  date?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  registrationEnabled?: boolean;
  isRegistrationOpen?: boolean;
  status?: string;
  effectiveStatus?: string;
}): boolean {
  if (!event) return false;
  if (event.isRegistrationOpen !== undefined) return Boolean(event.isRegistrationOpen);
  if (event.registrationEnabled === false) return false;

  const effStatus = getEffectiveEventStatus(event);
  if (effStatus === 'COMPLETED' || effStatus === 'CANCELLED') return false;

  const eventDateISO = normalizeDateToISO(event.date);
  if (!eventDateISO) return false;

  const today = todayIST();
  if (today >= eventDateISO) {
    return false;
  }

  if (event.registrationDeadline) {
    const deadlineISO = normalizeDateToISO(event.registrationDeadline);
    if (deadlineISO && today >= deadlineISO) {
      return false;
    }
  }

  return true;
}

export function formatDotDate(dateStr?: string): string {
  if (!dateStr) return '';
  const iso = normalizeDateToISO(dateStr);
  if (iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  return dateStr;
}

export function formatHumanDate(dateStr?: string): string {
  if (!dateStr) return '';
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return dateStr;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatHumanDateTime(dateStr?: string, time?: string): string {
  const label = formatHumanDate(dateStr);
  if (!time) return label;
  return `${label} · ${time}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const EVENT_CATEGORIES = [
  'Workshop',
  'Hackathon',
  'Technical Talk',
  'Seminar',
  'Coding Session',
  'Hands-on Session',
  'Project Showcase',
  'Community Meetup',
  'Other',
];

export const GALLERY_CATEGORIES = ['All', 'Workshops', 'Hackathons', 'Meetups', 'Team'];

// Keep in sync with backend/src/models/Resource.ts RESOURCE_CATEGORIES.
export const RESOURCE_CATEGORIES = [
  'Web Development',
  'AI/ML',
  'Cloud',
  'Git & GitHub',
  'Android',
  'Cybersecurity',
  'Open Source',
  'Programming',
  'Other',
];

export const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Instrumentation and Control Engineering',
  'Other',
];

export const TEAMS = [
  'Core Team',
  'Student Coordinators',
  'Technical Team',
  'Design Team',
  'Event Team',
  'Community Members',
];

export const ROLE_CATEGORIES = ['Organizer', 'Co-Organizer', 'Coordinators', 'Staff Advisors'] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export function getRoleCategory(member: { role?: string; team?: string; coordinatorRole?: string }): RoleCategory {
  const role = (member.role || '').trim().toLowerCase();
  const team = (member.team || '').trim().toLowerCase();

  if (
    role.includes('staff') ||
    role.includes('faculty') ||
    role.includes('advisor') ||
    team.includes('staff') ||
    team.includes('faculty') ||
    team.includes('advisor')
  ) {
    return 'Staff Advisors';
  }

  if (role === 'organizer' || role === 'lead' || role === 'community lead') {
    return 'Organizer';
  }
  if (role === 'co-organizer' || role === 'co-lead' || role === 'co organizer' || role === 'co lead') {
    return 'Co-Organizer';
  }
  return 'Coordinators';
}

export function groupMembersByRoleCategory<T extends { role?: string; team?: string; coordinatorRole?: string }>(
  members: T[]
): Record<RoleCategory, T[]> {
  const grouped: Record<RoleCategory, T[]> = {
    Organizer: [],
    'Co-Organizer': [],
    Coordinators: [],
    'Staff Advisors': [],
  };
  for (const m of members) {
    const cat = getRoleCategory(m);
    grouped[cat].push(m);
  }
  return grouped;
}

export const YEARS = ['I', 'II', 'III', 'IV'];

export const COORDINATOR_RESPONSIBILITIES = [
  'Outreach Coordinator',
  'Event Coordinator',
  'Technical Coordinator',
  'Design Coordinator',
  'Documentation'
] as const;

export function getMemberDisplayRole(member: { role?: string; team?: string; coordinatorRole?: string }): string {
  const cat = getRoleCategory(member);
  const coordinatorRole = (member.coordinatorRole || '').trim();
  const role = (member.role || '').trim();

  if (cat === 'Organizer') return 'Organizer';
  if (cat === 'Co-Organizer') return 'Co-Organizer';
  if (cat === 'Staff Advisors') return 'Staff Advisor';

  if (coordinatorRole) return coordinatorRole;
  if (role && role !== 'Member' && role !== 'Coordinator') return role;

  return 'Coordinator';
}

export function getCleanRoleLabel(member: { role?: string; team?: string; coordinatorRole?: string }): string {
  return getMemberDisplayRole(member);
}

export function sortMembersByRoleHierarchy<T extends { role?: string; team?: string; coordinatorRole?: string }>(
  members: T[]
): T[] {
  const roleRank: Record<RoleCategory, number> = {
    Organizer: 1,
    'Co-Organizer': 2,
    Coordinators: 3,
    'Staff Advisors': 4,
  };

  return [...members].sort((a, b) => {
    const rankA = roleRank[getRoleCategory(a)] || 99;
    const rankB = roleRank[getRoleCategory(b)] || 99;
    return rankA - rankB;
  });
}

