// ── Core email utility — fire-and-forget, never throws ────────────

export interface EmailPayload {
  to:      string | string[];
  subject: string;
  html:    string;
}

// ── Public API ────────────────────────────────────────────────────
// Call this anywhere. It returns immediately; sending is async.

export function sendEmail(payload: EmailPayload): void {
  _dispatch(payload).catch((err) =>
    console.error("[email] Send failed:", payload.subject, err),
  );
}

// ── Internal dispatch ─────────────────────────────────────────────

async function _dispatch(payload: EmailPayload): Promise<void> {
  const from     = process.env.EMAIL_FROM ?? "Campus-X <noreply@school.edu>";
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  // ── Guard: no-op in test / when keys missing ──────────────────
  if (process.env.NODE_ENV === "test") return;

  if (provider === "smtp") {
    await _sendViaSMTP(from, payload);
  } else {
    await _sendViaResend(from, payload);
  }
}

// ── Resend ────────────────────────────────────────────────────────

async function _sendViaResend(
  from:    string,
  payload: EmailPayload,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — email skipped.");
    return;
  }

  // Dynamic import so the module is tree-shaken when not needed
  const { Resend } = await import("resend");
  const resend     = new Resend(key);

  await resend.emails.send({
    from,
    to:      Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html:    payload.html,
  });
}

// ── SMTP (nodemailer) fallback ─────────────────────────────────────

async function _sendViaSMTP(
  from:    string,
  payload: EmailPayload,
): Promise<void> {
  // Install: npm install nodemailer @types/nodemailer
  // This branch is only entered when EMAIL_PROVIDER=smtp
  const nodemailer = await import("nodemailer").catch(() => {
    console.warn("[email] nodemailer not installed — email skipped.");
    return null;
  });
  if (!nodemailer) return;

  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from,
    to:      Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
    subject: payload.subject,
    html:    payload.html,
  });
}