// @ts-nocheck
import { EventModel } from '../models';

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
