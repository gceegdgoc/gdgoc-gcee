import { baseEmailHtml, escapeHtml } from './base.template';
import { CLUB } from '../../../config/env';

export interface EventRegistrationEmailOptions {
  studentName?: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  registrationId: string;
  instructions?: string;
}

export function generateEventRegistrationEmailHtml(opts: EventRegistrationEmailOptions): { subject: string; html: string; text: string } {
  const name = escapeHtml(opts.studentName || 'Student');
  const eventTitle = escapeHtml(opts.eventName);
  const eventDate = escapeHtml(opts.eventDate || 'TBA');
  const eventTime = escapeHtml(opts.eventTime || 'TBA');
  const eventVenue = escapeHtml(opts.venue || CLUB.institution);
  const regId = escapeHtml(opts.registrationId);
  const subject = `Registration Confirmed – ${opts.eventName}`;

  const instructionsHtml = opts.instructions
    ? `
      <div style="background-color:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:14px 16px; margin:20px 0;">
        <p style="margin:0 0 6px 0; color:#92400e; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Important Instructions</p>
        <p style="margin:0; color:#78350f; font-size:13px; line-height:1.5; white-space:pre-wrap;">${escapeHtml(opts.instructions)}</p>
      </div>
    `
    : '';

  const content = `
    <tr>
      <td style="background-color:#f0fdf4; border-bottom:1px solid #bbf7d0; padding:14px 32px;">
        <p style="margin:0; color:#166534; font-size:14px; font-weight:600;">
          &#10003; Registration Confirmed
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 12px 32px;">
        <p style="margin:0; color:#1e293b; font-size:15px; line-height:1.5;">
          Dear <strong>${name}</strong>,
        </p>
        <p style="margin:12px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          You have successfully registered for <strong>${eventTitle}</strong>. Please find your registration details below:
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px;">
        <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; width:35%; border-bottom:1px solid #e2e8f0;">Registration ID</td>
            <td style="color:#0b1b33; font-size:14px; font-weight:700; font-family:monospace; border-bottom:1px solid #e2e8f0;">${regId}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0;">Event</td>
            <td style="color:#0b1b33; font-size:13px; font-weight:600; border-bottom:1px solid #e2e8f0;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0;">Date</td>
            <td style="color:#0b1b33; font-size:13px; border-bottom:1px solid #e2e8f0;">${eventDate}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0;">Time</td>
            <td style="color:#0b1b33; font-size:13px; border-bottom:1px solid #e2e8f0;">${eventTime}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Venue</td>
            <td style="color:#0b1b33; font-size:13px;">${eventVenue}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 32px 32px;">
        ${instructionsHtml}
        <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 20px 0;">
          Please keep this email and your <strong>Registration ID (${regId})</strong> handy for check-in at the venue.
        </p>
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

You have successfully registered for ${opts.eventName}.

Registration Details:
- Registration ID: ${opts.registrationId}
- Event: ${opts.eventName}
- Date: ${opts.eventDate || 'TBA'}
- Time: ${opts.eventTime || 'TBA'}
- Venue: ${opts.venue || CLUB.institution}

${opts.instructions ? `Instructions: ${opts.instructions}\n\n` : ''}
Please keep this email and Registration ID handy for check-in.

Best regards,
GDGoC GCEE Team`;

  return {
    subject,
    html: baseEmailHtml(content, `Registration confirmed for ${opts.eventName}`),
    text,
  };
}
