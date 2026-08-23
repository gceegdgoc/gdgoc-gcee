import { baseEmailHtml, escapeHtml } from './base.template';
import { CLUB } from '../../../config/env';

export interface AnnouncementEmailOptions {
  studentName?: string;
  title: string;
  type?: 'Workshop' | 'Hackathon' | 'Event' | 'Announcement' | string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  customMessage?: string;
  posterUrl?: string;
  registrationLink?: string;
  deadline?: string;
  subject?: string;
}

export function generateAnnouncementEmailHtml(opts: AnnouncementEmailOptions): { subject: string; html: string; text: string } {
  const name = escapeHtml(opts.studentName || 'Student');
  const title = escapeHtml(opts.title);
  const type = escapeHtml(opts.type || 'Event');
  const date = escapeHtml(opts.date || 'TBA');
  const time = escapeHtml(opts.time || 'TBA');
  const venue = escapeHtml(opts.venue || CLUB.institution);
  const subject = opts.subject || `[GDGoC GCEE] ${opts.title}`;
  const regUrl = opts.registrationLink || '';

  const posterHtml = opts.posterUrl
    ? `<tr><td style="padding:0;">
        <img src="${escapeHtml(opts.posterUrl)}" alt="${title} poster" width="580" style="display:block; width:100%; max-width:580px; height:auto; border:none;" />
      </td></tr>`
    : '';

  const detailsTable = (opts.date || opts.time || opts.venue)
    ? `
      <tr>
        <td style="padding:12px 32px;">
          <table width="100%" cellpadding="10" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
            ${opts.date ? `<tr><td style="color:#64748b; font-size:12px; text-transform:uppercase; width:35%; border-bottom:1px solid #e2e8f0;">Date</td><td style="color:#0b1b33; font-size:13px; font-weight:600; border-bottom:1px solid #e2e8f0;">${date}</td></tr>` : ''}
            ${opts.time ? `<tr><td style="color:#64748b; font-size:12px; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Time</td><td style="color:#0b1b33; font-size:13px; border-bottom:1px solid #e2e8f0;">${time}</td></tr>` : ''}
            ${opts.venue ? `<tr><td style="color:#64748b; font-size:12px; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Venue</td><td style="color:#0b1b33; font-size:13px; border-bottom:1px solid #e2e8f0;">${venue}</td></tr>` : ''}
            <tr><td style="color:#64748b; font-size:12px; text-transform:uppercase;">Category</td><td style="color:#0b1b33; font-size:13px;">${type}</td></tr>
          </table>
        </td>
      </tr>
    `
    : '';

  const actionButton = regUrl
    ? `
      <tr>
        <td style="padding:16px 32px; text-align:center;">
          <a href="${escapeHtml(regUrl)}" style="background-color:#34A853; color:#ffffff; font-weight:700; font-size:14px; padding:13px 32px; border-radius:8px; text-decoration:none; display:inline-block; box-shadow:0 2px 4px rgba(52,168,83,0.3);">
            REGISTER NOW
          </a>
          ${opts.deadline ? `<p style="margin:8px 0 0 0; color:#64748b; font-size:12px;">Deadline: <strong>${escapeHtml(opts.deadline)}</strong></p>` : ''}
        </td>
      </tr>
    `
    : '';

  const content = `
    ${posterHtml}
    <tr>
      <td style="padding:28px 32px 12px 32px;">
        <span style="display:inline-block; background-color:#eff6ff; color:#2563eb; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:4px 10px; border-radius:6px; margin-bottom:10px;">
          ${type}
        </span>
        <h2 style="margin:0 0 12px 0; color:#0b1b33; font-size:20px; font-weight:800; line-height:1.3;">${title}</h2>
        <p style="margin:0 0 14px 0; color:#1e293b; font-size:15px; line-height:1.5;">Dear <strong>${name}</strong>,</p>
        ${opts.description ? `<p style="margin:0 0 14px 0; color:#475569; font-size:14px; line-height:1.6;">${escapeHtml(opts.description)}</p>` : ''}
        ${opts.customMessage ? `<div style="margin:14px 0; color:#334155; font-size:14px; line-height:1.6; white-space:pre-wrap;">${escapeHtml(opts.customMessage)}</div>` : ''}
      </td>
    </tr>
    ${detailsTable}
    ${actionButton}
    <tr>
      <td style="padding:12px 32px 32px 32px;">
        <p style="margin:0; color:#475569; font-size:13px; line-height:1.6;">We look forward to your active participation!</p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;" />
        <p style="margin:0; color:#64748b; font-size:12px; line-height:1.5;">
          Best regards,<br/>
          <strong>${CLUB.name} Team</strong><br/>
          ${CLUB.institution}
        </p>
      </td>
    </tr>
  `;

  const text = `Dear ${opts.studentName || 'Student'},

${opts.title} (${opts.type || 'Event'})

${opts.description || ''}
${opts.customMessage || ''}

Date: ${opts.date || 'TBA'}
Time: ${opts.time || 'TBA'}
Venue: ${opts.venue || CLUB.institution}
${opts.registrationLink ? `\nRegister here: ${opts.registrationLink}` : ''}

Best regards,
GDGoC GCEE Team`;

  return {
    subject,
    html: baseEmailHtml(content, `${opts.type || 'Announcement'}: ${opts.title}`),
    text,
  };
}
