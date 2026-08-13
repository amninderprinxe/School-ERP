// ── Shared HTML wrapper for all email templates ────────────────────
// Table-based for maximum email-client compatibility.

export interface BaseEmailData {
  schoolName:   string;
  previewText?: string;
}

export function baseTemplate(
  school:  string,
  content: string,
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${school}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1e40af;border-radius:12px 12px 0 0;
              padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display:inline-block;width:40px;height:40px;
                      background:#3b82f6;border-radius:10px;line-height:40px;
                      text-align:center;margin-bottom:10px;">
                      <span style="color:#ffffff;font-size:20px;font-weight:bold;">
                        &#127979;
                      </span>
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:20px;
                      font-weight:bold;letter-spacing:-0.3px;">
                      ${escHtml(school)}
                    </h1>
                    <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">
                      School Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
              border-radius:0 0 12px 12px;padding:20px 36px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;
                text-align:center;line-height:1.6;">
                This email was sent by <strong>${escHtml(school)}</strong>
                Campus-X.<br>
                Please do not reply to this automated message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}

// ── Shared component helpers ──────────────────────────────────────

export function escHtml(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

export function infoRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;
      font-weight:600;vertical-align:top;white-space:nowrap;">
      ${escHtml(label)}
    </td>
    <td style="padding:6px 0;color:#0f172a;font-size:13px;vertical-align:top;">
      ${value}
    </td>
  </tr>`.trim();
}

export function infoTable(rows: string): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0"
    style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
    padding:16px;width:100%;margin:16px 0;">
    <tbody>${rows}</tbody>
  </table>`.trim();
}

export function ctaButton(text: string, href: string): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td>
        <a href="${href}"
          style="display:inline-block;background:#1e40af;color:#ffffff;
          text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;
          border-radius:8px;letter-spacing:0.2px;">
          ${escHtml(text)}
        </a>
      </td>
    </tr>
  </table>`.trim();
}

export function alertBox(
  text:  string,
  color: "blue" | "amber" | "green" | "red" = "blue",
): string {
  const styles = {
    blue:  "background:#eff6ff;border-left:4px solid #3b82f6;color:#1e40af",
    amber: "background:#fffbeb;border-left:4px solid #f59e0b;color:#92400e",
    green: "background:#f0fdf4;border-left:4px solid #22c55e;color:#15803d",
    red:   "background:#fef2f2;border-left:4px solid #ef4444;color:#991b1b",
  };
  return `
  <div style="${styles[color]};border-radius:4px;padding:12px 16px;
    margin:16px 0;font-size:13px;line-height:1.5;">
    ${text}
  </div>`.trim();
}

export function h2(text: string): string {
  return `
  <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:700;
    letter-spacing:-0.3px;">
    ${escHtml(text)}
  </h2>`.trim();
}

export function p(text: string): string {
  return `
  <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.7;">
    ${text}
  </p>`.trim();
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">`;
}