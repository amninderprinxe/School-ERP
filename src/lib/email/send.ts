import {
  getTransporter,
  FROM_ADDRESS,
  EMAIL_ENABLED,
}                    from "./transport";
import {
  welcomeEmailHtml,        welcomeEmailText,
  announcementEmailHtml,   announcementEmailText,
  examEmailHtml,           examEmailText,
  resultEmailHtml,         resultEmailText,
  feeDueEmailHtml,         feeDueEmailText,
  feeConfirmationEmailHtml,feeConfirmationEmailText,
  type WelcomeEmailData,
  type AnnouncementEmailData,
  type ExamEmailData,
  type ResultEmailData,
  type FeeDueEmailData,
  type FeeConfirmationEmailData,
}                    from "./templates";

// ── Low-level send ────────────────────────────────────────────────

interface SendEmailOptions {
  to:      string | string[];
  subject: string;
  html:    string;
  text:    string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.info(
      `[email:dev] Would send to ${Array.isArray(opts.to) ? opts.to.join(",") : opts.to}: ${opts.subject}`,
    );
    return;
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from:    FROM_ADDRESS,
      to:      Array.isArray(opts.to) ? opts.to.join(",") : opts.to,
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text,
    });
  } catch (err) {
    // Email failures must never crash the main action
    console.error("[email] sendEmail failed:", err);
  }
}

// ── Fire-and-forget wrapper ───────────────────────────────────────
// Use this from server actions — never await these in the request path

export function sendEmailAsync(opts: SendEmailOptions): void {
  sendEmail(opts).catch((err) =>
    console.error("[email] async send failed:", err),
  );
}

// ─────────────────────────────────────────────────────────────────
// TYPED SENDERS
// ─────────────────────────────────────────────────────────────────

// ── Welcome ───────────────────────────────────────────────────────

export function sendWelcomeEmail(
  to:   string,
  data: WelcomeEmailData,
): void {
  sendEmailAsync({
    to,
    subject: `Welcome to ${data.schoolName} — Your Account is Ready`,
    html:    welcomeEmailHtml(data),
    text:    welcomeEmailText(data),
  });
}

// ── Announcement ─────────────────────────────────────────────────

export function sendAnnouncementEmail(
  to:   string | string[],
  data: AnnouncementEmailData,
): void {
  // BCC all recipients so addresses aren't shared
  if (Array.isArray(to) && to.length === 0) return;
  sendEmailAsync({
    to:      Array.isArray(to) ? to[0]! : to,
    subject: `[${data.schoolName}] ${data.announcementTitle}`,
    html:    announcementEmailHtml(data),
    text:    announcementEmailText(data),
  });
}

// Batch version — sends individually to avoid exposing addresses
export async function sendAnnouncementEmailBatch(
  recipients: { email: string; name: string }[],
  data:        Omit<AnnouncementEmailData, "recipientName">,
): Promise<void> {
  for (const r of recipients) {
    sendEmailAsync({
      to:      r.email,
      subject: `[${data.schoolName}] ${data.announcementTitle}`,
      html:    announcementEmailHtml({ ...data, recipientName: r.name }),
      text:    announcementEmailText({ ...data, recipientName: r.name }),
    });
  }
}

// ── Exam scheduled ───────────────────────────────────────────────

export function sendExamEmail(
  to:   string,
  data: ExamEmailData,
): void {
  sendEmailAsync({
    to,
    subject: `[${data.schoolName}] Exam Scheduled: ${data.examName}`,
    html:    examEmailHtml(data),
    text:    examEmailText(data),
  });
}

// ── Results ───────────────────────────────────────────────────────

export function sendResultEmail(
  to:   string,
  data: ResultEmailData,
): void {
  sendEmailAsync({
    to,
    subject: `[${data.schoolName}] Marks Available: ${data.examName} · ${data.subjectName}`,
    html:    resultEmailHtml(data),
    text:    resultEmailText(data),
  });
}

// ── Fee due reminder ─────────────────────────────────────────────

export function sendFeeDueEmail(
  to:   string,
  data: FeeDueEmailData,
): void {
  sendEmailAsync({
    to,
    subject: `[${data.schoolName}] Fee Reminder: ${data.categoryName}`,
    html:    feeDueEmailHtml(data),
    text:    feeDueEmailText(data),
  });
}

// ── Fee payment confirmation ──────────────────────────────────────

export function sendFeeConfirmationEmail(
  to:   string,
  data: FeeConfirmationEmailData,
): void {
  sendEmailAsync({
    to,
    subject: `[${data.schoolName}] Fee Payment Received — ${data.categoryName}`,
    html:    feeConfirmationEmailHtml(data),
    text:    feeConfirmationEmailText(data),
  });
}