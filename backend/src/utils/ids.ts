import { Certificate, EventModel } from '../models';

export function padNumber(n: number, length = 6): string {
  return String(n).padStart(length, '0');
}

/** Generate the next sequential eventId like EV-2026-0001 */
export async function nextEventId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EV-${year}-`;
  const last = await EventModel.find({ eventId: new RegExp(`^${prefix}`) })
    .sort({ eventId: -1 })
    .limit(1)
    .select('eventId')
    .lean();

  let seq = 1;
  if (last.length > 0) {
    const num = parseInt(last[0].eventId.replace(prefix, ''), 10);
    if (!Number.isNaN(num)) seq = num + 1;
  }
  return `${prefix}${padNumber(seq, 4)}`;
}

/** Generate certificateId like GDGCEE-20260818-A1B2 */
export async function nextCertificateId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GDGCEE-${dateStr}-${suffix}`;
}
