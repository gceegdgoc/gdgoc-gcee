import { baseEmailHtml, escapeHtml } from './base.template';
import { env, CLUB } from '../../../config/env';

export interface WelcomeEmailOptions {
  studentName?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `
      <tr>
        <td style="padding:6px 18px; color:#64748b; font-size:13px; width:140px; white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:6px 18px; color:#1e293b; font-size:13px; font-weight:600;">${escapeHtml(value)}</td>
      </tr>`;
}

export function generateWelcomeEmailHtml(opts: WelcomeEmailOptions): { subject: string; html: string; text: string } {
  const name = escapeHtml(opts.studentName || 'Student');
  const siteUrl = escapeHtml(env.clientUrl || env.appUrl || 'https://gdgoc-gcee.vercel.app');
  const subject = 'Welcome to GDGoC GCEE';

  const rows = [
    detailRow('Name', opts.studentName || ''),
    detailRow('Register Number', opts.rollNumber || '—'),
    detailRow('Department', opts.department || '—'),
    detailRow('Year', opts.year ? `Year ${opts.year}` : '—'),
  ].join('');

  const content = `
    <tr>
      <td style="padding:32px 32px 12px 32px;">
        <p style="margin:0; color:#1e293b; font-size:16px; line-height:1.5;">Hello <strong>${name}</strong>,</p>
        <p style="margin:16px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          Thank you for joining <strong>${CLUB.name}</strong>.
        </p>
        <p style="margin:12px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          Your community registration has been successfully completed.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;">
        <div style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 18px;">
          <p style="margin:0; color:#166534; font-size:13px; font-weight:700;">
            &#10003; Registration Successful &amp; Email Verified
          </p>
        </div>
      </td>
    </tr>
    ${rows ? `
    <tr>
      <td style="padding:16px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; border-collapse:separate; border-spacing:0;">
          <tr>
            <td style="padding:12px 18px 2px 18px; color:#334155; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Student details</td>
          </tr>${rows}
          <tr><td style="height:10px;"></td></tr>
        </table>
      </td>
    </tr>` : ''}
    <tr>
      <td style="padding:16px 32px 32px 32px;">
        <p style="margin:0; color:#475569; font-size:14px; line-height:1.6;">
          You can now participate in ${CLUB.name} workshops, events, hackathons and developer activities.
        </p>
        <p style="margin:24px 0; text-align:center;">
          <a href="${siteUrl}/dashboard" style="background-color:#4285F4; color:#ffffff; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none; display:inline-block; box-shadow:0 2px 4px rgba(66,133,244,0.3);">
            Access Student Dashboard
          </a>
        </p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="margin:0; color:#64748b; font-size:13px; line-height:1.5;">
          Regards,<br/>
          <strong>${CLUB.name}</strong><br/>
          ${CLUB.institution}
        </p>
      </td>
    </tr>
  `;

  const detailLines = [
    `Name: ${opts.studentName || '-'}`,
    `Register Number: ${opts.rollNumber || '-'}`,
    `Department: ${opts.department || '-'}`,
    `Year: ${opts.year ? `Year ${opts.year}` : '-'}`,
  ].join('\n');

  const text = `Hello ${opts.studentName || 'Student'},

Thank you for joining GDGoC GCEE.

Your community registration has been successfully completed.

Student details:
${detailLines}

You can now participate in GDGoC GCEE workshops, events, hackathons and developer activities.

Regards,
GDGoC GCEE
Government College of Engineering, Erode`;

  return {
    subject,
    html: baseEmailHtml(content, 'Welcome to GDGoC GCEE! Your registration is complete.'),
    text,
  };
}
