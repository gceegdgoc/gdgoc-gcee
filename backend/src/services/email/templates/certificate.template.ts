import { baseEmailHtml, escapeHtml } from './base.template';
import { CLUB } from '../../../config/env';

export interface CertificateEmailOptions {
  studentName?: string;
  eventName?: string;
  certificateId: string;
  verificationUrl: string;
  downloadUrl?: string;
}

export function generateCertificateEmailHtml(opts: CertificateEmailOptions): { subject: string; html: string; text: string } {
  const name = escapeHtml(opts.studentName || 'Student');
  const eventName = escapeHtml(opts.eventName || 'GDGoC GCEE Event');
  const certId = escapeHtml(opts.certificateId);
  const certTitle = 'Certificate of Participation';
  const subject = `Your Certificate for ${opts.eventName || 'GDGoC GCEE'} is Ready!`;

  const content = `
    <tr>
      <td style="padding:32px 32px 12px 32px;">
        <p style="margin:0; color:#1e293b; font-size:16px; line-height:1.5;">Hello <strong>${name}</strong>,</p>
        <p style="margin:14px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          Your official <strong>${certTitle}</strong> for <strong>${eventName}</strong> has been issued by ${CLUB.name}!
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px;">
        <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; width:35%; border-bottom:1px solid #e2e8f0;">Student Name</td>
            <td style="color:#0b1b33; font-size:13px; font-weight:700; border-bottom:1px solid #e2e8f0;">${name}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; width:35%; border-bottom:1px solid #e2e8f0;">Certificate Title</td>
            <td style="color:#0b1b33; font-size:13px; font-weight:700; border-bottom:1px solid #e2e8f0;">${certTitle}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase; width:35%; border-bottom:1px solid #e2e8f0;">Event Name</td>
            <td style="color:#0b1b33; font-size:13px; font-weight:600; border-bottom:1px solid #e2e8f0;">${eventName}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; text-transform:uppercase;">Certificate ID</td>
            <td style="color:#0b1b33; font-size:13px; font-weight:700; font-family:monospace;">${certId}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 32px 32px; text-align:center;">
        <div style="margin-bottom:20px;">
          <a href="${escapeHtml(opts.verificationUrl)}" style="background-color:#4285F4; color:#ffffff; font-weight:700; font-size:14px; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin-right:8px; margin-bottom:8px;">
            View Certificate
          </a>
          ${opts.downloadUrl ? `
          <a href="${escapeHtml(opts.downloadUrl)}" style="background-color:#34A853; color:#ffffff; font-weight:700; font-size:14px; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin-bottom:8px;">
            Download Certificate
          </a>` : ''}
        </div>
        <p style="margin:0; color:#94a3b8; font-size:11px;">
          This is an authentic certificate issued by ${CLUB.name} at ${CLUB.institution}.
        </p>
      </td>
    </tr>
  `;

  const text = `Hello ${opts.studentName || 'Student'},

Your official ${certTitle} for ${opts.eventName || 'GDGoC GCEE'} has been issued!

Certificate Title: ${certTitle}
Event Name: ${opts.eventName || 'GDGoC GCEE Event'}
Certificate ID: ${opts.certificateId}
View Certificate URL: ${opts.verificationUrl}
${opts.downloadUrl ? `Download Certificate URL: ${opts.downloadUrl}` : ''}

Best regards,
GDGoC GCEE Team`;

  return {
    subject,
    html: baseEmailHtml(content, `Your certificate for ${opts.eventName || 'GDGoC GCEE'} is ready`),
    text,
  };
}
