import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ── Singleton transport ───────────────────────────────────────────
let _transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    // Generous timeouts for school environments
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     30_000,
  });

  return _transporter;
}

export const FROM_ADDRESS =
  `"${process.env.EMAIL_FROM_NAME ?? "School ERP"}" ` +
  `<${process.env.EMAIL_FROM_ADDRESS ?? process.env.SMTP_USER ?? "noreply@school.edu"}>`;

export const EMAIL_ENABLED =
  process.env.EMAIL_ENABLED !== "false" &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;