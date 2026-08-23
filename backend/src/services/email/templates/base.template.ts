import { env, CLUB, getPublicAppUrl } from '../../../config/env';

export function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function baseEmailHtml(content: string, previewText?: string): string {
  const siteUrl = escapeHtml(getPublicAppUrl());
  const previewTag = previewText
    ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${escapeHtml(previewText)}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${CLUB.name}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#1e293b;">
  ${previewTag}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0b1b33; padding:28px 32px; text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.5px; line-height:1.2;">${CLUB.name}</h1>
                    <p style="margin:6px 0 0 0; color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">Google Developer Groups on Campus</p>
                    <p style="margin:2px 0 0 0; color:#64748b; font-size:11px;">${CLUB.institution}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:24px 32px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; color:#64748b; font-size:12px; line-height:1.6;">
                <strong>${CLUB.name}</strong> · ${CLUB.institution}<br/>
                <a href="${siteUrl}" style="color:#4285F4; text-decoration:none; font-weight:600;">Visit Community Website</a>
              </p>
              <p style="margin:10px 0 0 0; color:#94a3b8; font-size:11px;">
                This is an official communication from GDGoC GCEE.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
