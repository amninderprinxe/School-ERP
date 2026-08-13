import {
  baseTemplate, escHtml,
  h2, p, infoTable, infoRow, alertBox, divider,
} from "./base";

export interface PasswordResetEmailData {
  schoolName:       string;
  recipientName:    string;
  email:            string;
  temporaryPassword: string;
  resetByName:      string;
  loginUrl?:        string;
}

export function passwordResetEmail(data: PasswordResetEmailData): string {
  const loginUrl = data.loginUrl ?? `${process.env.NEXTAUTH_URL ?? ""}/login`;

  const content = `
    ${h2("Your Password Has Been Reset")}
    ${p(`Hi <strong>${escHtml(data.recipientName)}</strong>,`)}
    ${p(`Your password on the ${escHtml(data.schoolName)} Campus-X has been reset
         by <strong>${escHtml(data.resetByName)}</strong>.
         Your new temporary credentials are:`)}

    ${infoTable(
      infoRow("Email",        `<strong>${escHtml(data.email)}</strong>`) +
      infoRow("New Password", `<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;
        font-size:14px;font-weight:bold;letter-spacing:1px;">
        ${escHtml(data.temporaryPassword)}</code>`),
    )}

    ${alertBox(
      "🔐 <strong>Please change your password immediately</strong> after logging in. " +
      "Do not share your credentials with anyone.",
      "amber",
    )}

    <a href="${escHtml(loginUrl)}"
      style="display:inline-block;background:#1e40af;color:#ffffff;
      text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;
      border-radius:8px;margin:8px 0 24px;">
      Login Now →
    </a>

    ${divider()}
    ${p(`<span style="color:#94a3b8;font-size:12px;">
      If you did not request this change, please contact your school administrator
      immediately at <strong>${escHtml(data.schoolName)}</strong>.
    </span>`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function passwordResetEmailSubject(): string {
  return "Your Campus-X Password Has Been Reset";
}