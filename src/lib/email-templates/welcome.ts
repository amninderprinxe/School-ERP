import {
  baseTemplate, escHtml,
  h2, p, infoTable, infoRow, alertBox, divider,
} from "./base";

export interface WelcomeEmailData {
  schoolName:       string;
  recipientName:    string;
  email:            string;
  temporaryPassword: string;
  role:             string;
  loginUrl?:        string;
}

function formatRole(role: string): string {
  return role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function welcomeEmail(data: WelcomeEmailData): string {
  const loginUrl = data.loginUrl ?? `${process.env.NEXTAUTH_URL ?? ""}/login`;

  const content = `
    ${h2(`Welcome to ${escHtml(data.schoolName)}!`)}
    ${p(`Hi <strong>${escHtml(data.recipientName)}</strong>,`)}
    ${p(`Your account has been created on the ${escHtml(data.schoolName)} Campus-X platform.
         Here are your login credentials:`)}

    ${infoTable(
      infoRow("Email",    `<strong>${escHtml(data.email)}</strong>`) +
      infoRow("Password", `<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;
        font-size:14px;font-weight:bold;letter-spacing:1px;">
        ${escHtml(data.temporaryPassword)}</code>`) +
      infoRow("Role",     `<span style="background:#eff6ff;color:#1e40af;padding:2px 8px;
        border-radius:4px;font-size:12px;font-weight:600;">
        ${escHtml(formatRole(data.role))}</span>`),
    )}

    ${alertBox(
      "⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security.",
      "amber",
    )}

    <a href="${escHtml(loginUrl)}"
      style="display:inline-block;background:#1e40af;color:#ffffff;
      text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;
      border-radius:8px;margin:8px 0 24px;">
      Login to Campus-X →
    </a>

    ${divider()}
    ${p(`<span style="color:#94a3b8;font-size:12px;">
      If you did not expect this email, please contact your school administrator.
    </span>`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function welcomeEmailSubject(schoolName: string): string {
  return `Welcome to ${schoolName} — Your Account Is Ready`;
}