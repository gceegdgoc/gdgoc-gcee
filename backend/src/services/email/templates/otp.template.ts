import { baseEmailHtml, escapeHtml } from './base.template';

export interface OtpEmailOptions {
  studentName?: string;
  otp: string;
}

export function generateOtpEmailHtml(opts: OtpEmailOptions): { subject: string; html: string; text: string } {
  const name = escapeHtml(opts.studentName || 'Student');
  const otp = String(opts.otp || '').trim();
  const subject = 'Your GDGoC GCEE Verification OTP';

  const content = `
    <tr>
      <td style="padding:32px 32px 12px 32px;">
        <h2 style="margin:0 0 16px 0; color:#0b1b33; font-size:20px; font-weight:700;">GDGoC GCEE</h2>
        <p style="margin:0; color:#334155; font-size:15px; line-height:1.5;">Hello <strong>${name}</strong>,</p>
        <p style="margin:16px 0 0 0; color:#475569; font-size:14px; line-height:1.6;">
          Your verification OTP is:
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px; text-align:center;">
        <div style="
          display:inline-block;
          letter-spacing:8px;
          font-size:32px;
          font-weight:800;
          font-family:Consolas, Monaco, 'Courier New', monospace;
          background-color:#f1f5f9;
          color:#0f172a;
          padding:18px 36px;
          border-radius:12px;
          border:2px solid #4285F4;
          text-align:center;
        ">
          ${otp}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 32px 32px;">
        <div style="background-color:#eff6ff; border:1px solid #dbeafe; border-radius:10px; padding:12px 16px; margin-bottom:20px;">
          <p style="margin:0; color:#1e40af; font-size:13px; font-weight:600;">
            ⏱ This OTP expires in 10 minutes.
          </p>
        </div>
        <p style="margin:0 0 20px 0; color:#64748b; font-size:13px; line-height:1.5;">
          If you did not request this OTP, please ignore this email.
        </p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;" />
        <p style="margin:0; color:#475569; font-size:13px; line-height:1.5;">
          Regards,<br/>
          <strong>GDGoC GCEE Team</strong>
        </p>
      </td>
    </tr>
  `;

  const text = `Your GDGoC GCEE verification OTP is ${otp}. It expires in 10 minutes.

If you did not request this OTP, please ignore this email.

Regards,
GDGoC GCEE Team`;

  return {
    subject,
    html: baseEmailHtml(content, `Your verification OTP is ${otp} (valid for 10 minutes)`),
    text,
  };
}
