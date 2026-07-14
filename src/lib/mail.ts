import nodemailer from "nodemailer";

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createTransporter() {
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");

  if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
    throw new Error("SMTP_PORT must be a valid positive integer.");
  }

  return nodemailer.createTransport({
    host: getRequiredEnvironmentVariable("SMTP_HOST"),
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: getRequiredEnvironmentVariable("SMTP_USER"),
      pass: getRequiredEnvironmentVariable("SMTP_PASSWORD"),
    },
  });
}

type SendPasswordResetEmailInput = {
  recipientEmail: string;
  recipientName?: string | null;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  recipientEmail,
  recipientName,
  resetUrl,
}: SendPasswordResetEmailInput) {
  const transporter = createTransporter();

  const productName = process.env.APP_NAME ?? "School ERP";
  const fromEmail = getRequiredEnvironmentVariable("SMTP_FROM_EMAIL");
  const fromName = process.env.SMTP_FROM_NAME ?? productName;

  const greeting = recipientName?.trim()
    ? `Hello ${recipientName.trim()},`
    : "Hello,";

  await transporter.sendMail({
    from: {
      name: fromName,
      address: fromEmail,
    },
    to: recipientEmail,
    subject: `Reset your ${productName} password`,
    text: [
      greeting,
      "",
      `We received a request to reset your ${productName} password.`,
      "",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 30 minutes.",
      "If you did not request this change, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #2563eb;">${escapeHtml(productName)}</h2>

        <p>${escapeHtml(greeting)}</p>

        <p>
          We received a request to reset your
          ${escapeHtml(productName)} password.
        </p>

        <p style="margin: 28px 0;">
          <a
            href="${escapeHtml(resetUrl)}"
            style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;"
          >
            Reset Password
          </a>
        </p>

        <p>This link expires in 30 minutes.</p>

        <p style="color: #6b7280; font-size: 14px;">
          If you did not request this change, you can ignore this email.
        </p>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}