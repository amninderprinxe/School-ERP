// ── Shared HTML shell ─────────────────────────────────────────────

export function htmlShell(
  schoolName: string,
  content:    string,
  year?:      string,
): string {
  const currentYear = year ?? new Date().getFullYear().toString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${schoolName}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
  </xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">
                      ${escHtml(schoolName)}
                    </p>
                    <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">
                      School ERP — Student Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
                This is an automated message from ${escHtml(schoolName)}.<br/>
                Please do not reply to this email.
              </p>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:10px;">
                © ${currentYear} ${escHtml(schoolName)} · Powered by School ERP
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

// ── Escape HTML entities ──────────────────────────────────────────
export function escHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── Shared UI helpers ─────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${escHtml(text)}</h1>`;
}

function subheading(text: string): string {
  return `<p style="margin:0 0 24px;color:#64748b;font-size:14px;">${escHtml(text)}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

function infoRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;width:140px;vertical-align:top;">
      ${escHtml(label)}
    </td>
    <td style="padding:6px 0;color:#1e293b;font-size:13px;vertical-align:top;">
      ${escHtml(value)}
    </td>
  </tr>`;
}

function infoTable(rows: { label: string; value: string }[]): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%"
    style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
    ${rows.map((r) => infoRow(r.label, r.value)).join("")}
  </table>`;
}

function ctaButton(text: string, href: string): string {
  return `
  <p style="text-align:center;margin:28px 0 0;">
    <a href="${escHtml(href)}"
      style="display:inline-block;background-color:#1e40af;color:#ffffff;
        font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;
        text-decoration:none;letter-spacing:0.2px;">
      ${escHtml(text)}
    </a>
  </p>`;
}

function alertBox(text: string, type: "info" | "warn" | "danger" = "info"): string {
  const colors = {
    info:   { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
    warn:   { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
    danger: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  };
  const c = colors[type];
  return `
  <div style="background:${c.bg};border-left:4px solid ${c.border};
    border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
    <p style="margin:0;color:${c.text};font-size:13px;line-height:1.5;">
      ${escHtml(text)}
    </p>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────

// ── 1. Welcome (new account) ──────────────────────────────────────

export interface WelcomeEmailData {
  schoolName:  string;
  studentName: string;
  email:       string;
  password:    string;
  role:        string;
  loginUrl:    string;
}

export function welcomeEmailHtml(d: WelcomeEmailData): string {
  const roleLabel =
    d.role === "STUDENT"      ? "Student"
    : d.role === "TEACHER"    ? "Teacher"
    : d.role === "PARENT"     ? "Parent"
    : d.role === "SCHOOL_ADMIN" ? "School Administrator"
    : d.role;

  const content = `
    ${heading(`Welcome to ${d.schoolName}!`)}
    ${subheading(`Your ${roleLabel} account has been created.`)}

    <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">
      Hello <strong>${escHtml(d.studentName)}</strong>,<br/>
      Your School ERP account is ready. Use the credentials below to sign in.
    </p>

    ${infoTable([
      { label: "Email",    value: d.email      },
      { label: "Password", value: d.password   },
      { label: "Role",     value: roleLabel    },
      { label: "School",   value: d.schoolName },
    ])}

    ${alertBox(
      "For your security, please change your password immediately after your first login.",
      "warn",
    )}

    ${ctaButton("Sign In Now", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function welcomeEmailText(d: WelcomeEmailData): string {
  return [
    `Welcome to ${d.schoolName}!`,
    "",
    `Hello ${d.studentName},`,
    `Your School ERP account has been created.`,
    "",
    `Email:    ${d.email}`,
    `Password: ${d.password}`,
    "",
    `Please change your password after your first login.`,
    "",
    `Sign in at: ${d.loginUrl}`,
  ].join("\n");
}

// ── 2. Announcement ───────────────────────────────────────────────

export interface AnnouncementEmailData {
  schoolName:        string;
  recipientName:     string;
  announcementTitle: string;
  announcementBody:  string;
  postedBy:          string;
  postedAt:          Date;
  loginUrl:          string;
}

export function announcementEmailHtml(d: AnnouncementEmailData): string {
  const date = new Date(d.postedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const content = `
    ${heading("New Announcement")}
    ${subheading(`From ${d.schoolName}`)}

    <p style="margin:0 0 16px;color:#374151;font-size:14px;">
      Hello <strong>${escHtml(d.recipientName)}</strong>,
    </p>

    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#1e40af;padding:14px 20px;">
        <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">
          ${escHtml(d.announcementTitle)}
        </p>
      </div>
      <div style="padding:18px 20px;background:#ffffff;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-line;">
          ${escHtml(d.announcementBody)}
        </p>
        ${divider()}
        <p style="margin:0;color:#94a3b8;font-size:12px;">
          Posted by <strong>${escHtml(d.postedBy)}</strong> · ${escHtml(date)}
        </p>
      </div>
    </div>

    ${ctaButton("View in Portal", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function announcementEmailText(d: AnnouncementEmailData): string {
  return [
    `New Announcement from ${d.schoolName}`,
    "",
    `Hello ${d.recipientName},`,
    "",
    d.announcementTitle.toUpperCase(),
    "",
    d.announcementBody,
    "",
    `Posted by ${d.postedBy}`,
    `Login to view: ${d.loginUrl}`,
  ].join("\n");
}

// ── 3. Exam Created / Scheduled ───────────────────────────────────

export interface ExamEmailData {
  schoolName:   string;
  recipientName:string;
  examName:     string;
  examType:     string;
  className:    string;
  startDate:    Date | null;
  endDate:      Date | null;
  loginUrl:     string;
}

function fmtDate(d: Date | null): string {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function examEmailHtml(d: ExamEmailData): string {
  const content = `
    ${heading("Exam Scheduled")}
    ${subheading(`${d.examName} · ${d.className}`)}

    <p style="margin:0 0 20px;color:#374151;font-size:14px;">
      Hello <strong>${escHtml(d.recipientName)}</strong>,
      a new exam has been scheduled for your class.
    </p>

    ${infoTable([
      { label: "Exam Name",  value: d.examName  },
      { label: "Type",       value: d.examType  },
      { label: "Class",      value: d.className },
      { label: "Start Date", value: fmtDate(d.startDate) },
      { label: "End Date",   value: fmtDate(d.endDate)   },
    ])}

    ${alertBox("Please check the timetable and prepare accordingly.", "info")}

    ${ctaButton("View Timetable", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function examEmailText(d: ExamEmailData): string {
  return [
    `Exam Scheduled: ${d.examName}`,
    "",
    `Hello ${d.recipientName},`,
    `A new ${d.examType} has been scheduled for ${d.className}.`,
    "",
    `Start: ${fmtDate(d.startDate)}`,
    `End:   ${fmtDate(d.endDate)}`,
    "",
    `Login to view details: ${d.loginUrl}`,
  ].join("\n");
}

// ── 4. Results Published ──────────────────────────────────────────

export interface ResultEmailData {
  schoolName:    string;
  recipientName: string;
  studentName:   string;
  examName:      string;
  subjectName:   string;
  marksObtained: number;
  maxMarks:      number;
  grade:         string | null;
  percentage:    number;
  loginUrl:      string;
}

export function resultEmailHtml(d: ResultEmailData): string {
  const passed = d.marksObtained / d.maxMarks >= 0.4;

  const content = `
    ${heading("Marks Available")}
    ${subheading(`${d.examName} · ${d.subjectName}`)}

    <p style="margin:0 0 20px;color:#374151;font-size:14px;">
      Hello <strong>${escHtml(d.recipientName)}</strong>,
      marks for <strong>${escHtml(d.studentName)}</strong> have been entered.
    </p>

    ${infoTable([
      { label: "Student",   value: d.studentName    },
      { label: "Exam",      value: d.examName       },
      { label: "Subject",   value: d.subjectName    },
      { label: "Marks",     value: `${d.marksObtained} / ${d.maxMarks}` },
      { label: "Percentage",value: `${d.percentage}%` },
      { label: "Grade",     value: d.grade ?? "—"   },
      { label: "Result",    value: passed ? "PASS" : "FAIL" },
    ])}

    ${passed
      ? alertBox("Congratulations! Marks indicate a passing result.", "info")
      : alertBox("This subject shows a failing result. Please discuss with your teacher.", "warn")}

    ${ctaButton("View Full Report Card", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function resultEmailText(d: ResultEmailData): string {
  return [
    `Marks Published: ${d.examName}`,
    "",
    `Hello ${d.recipientName},`,
    `Marks for ${d.studentName} have been entered.`,
    "",
    `Subject:    ${d.subjectName}`,
    `Marks:      ${d.marksObtained} / ${d.maxMarks}`,
    `Percentage: ${d.percentage}%`,
    `Grade:      ${d.grade ?? "—"}`,
    "",
    `View results: ${d.loginUrl}`,
  ].join("\n");
}

// ── 5. Fee Due Reminder ───────────────────────────────────────────

export interface FeeDueEmailData {
  schoolName:      string;
  recipientName:   string;
  studentName:     string;
  categoryName:    string;
  academicYear:    string;
  dueDate:         Date | null;
  amountDue:       number;
  amountPaid:      number;
  outstanding:     number;
  loginUrl:        string;
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function feeDueEmailHtml(d: FeeDueEmailData): string {
  const content = `
    ${heading("Fee Payment Reminder")}
    ${subheading(`${d.categoryName} · ${d.academicYear}`)}

    <p style="margin:0 0 20px;color:#374151;font-size:14px;">
      Hello <strong>${escHtml(d.recipientName)}</strong>,
      this is a reminder about the outstanding fee for
      <strong>${escHtml(d.studentName)}</strong>.
    </p>

    ${infoTable([
      { label: "Student",      value: d.studentName   },
      { label: "Fee Category", value: d.categoryName  },
      { label: "Academic Year",value: d.academicYear  },
      { label: "Due Date",     value: fmtDate(d.dueDate) },
      { label: "Total Fee",    value: fmtINR(d.amountDue)     },
      { label: "Amount Paid",  value: fmtINR(d.amountPaid)    },
      { label: "Outstanding",  value: fmtINR(d.outstanding)   },
    ])}

    ${alertBox(
      `Outstanding balance of ${fmtINR(d.outstanding)} is pending. ` +
      "Please visit the school office to complete the payment.",
      "warn",
    )}

    ${ctaButton("View Fee Details", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function feeDueEmailText(d: FeeDueEmailData): string {
  return [
    `Fee Payment Reminder — ${d.categoryName}`,
    "",
    `Hello ${d.recipientName},`,
    `Regarding: ${d.studentName}`,
    "",
    `Outstanding: ${fmtINR(d.outstanding)}`,
    `Due Date:    ${fmtDate(d.dueDate)}`,
    "",
    `Please visit the school office to pay.`,
    `Details: ${d.loginUrl}`,
  ].join("\n");
}

// ── 6. Fee Payment Confirmation ───────────────────────────────────

export interface FeeConfirmationEmailData {
  schoolName:    string;
  recipientName: string;
  studentName:   string;
  categoryName:  string;
  academicYear:  string;
  amountPaid:    number;
  outstanding:   number;
  status:        string;
  paymentMode:   string;
  transactionRef:string | null;
  paymentDate:   Date | null;
  loginUrl:      string;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE:        "Cheque",
  ONLINE:        "Online",
};

export function feeConfirmationEmailHtml(d: FeeConfirmationEmailData): string {
  const rows = [
    { label: "Student",       value: d.studentName  },
    { label: "Fee Category",  value: d.categoryName },
    { label: "Academic Year", value: d.academicYear },
    { label: "Amount Paid",   value: fmtINR(d.amountPaid)  },
    { label: "Outstanding",   value: d.outstanding > 0 ? fmtINR(d.outstanding) : "Nil" },
    { label: "Status",        value: d.status },
    { label: "Payment Mode",  value: PAYMENT_MODE_LABELS[d.paymentMode] ?? d.paymentMode },
  ];
  if (d.transactionRef) {
    rows.push({ label: "Reference", value: d.transactionRef });
  }
  if (d.paymentDate) {
    rows.push({ label: "Date", value: fmtDate(d.paymentDate) });
  }

  const content = `
    ${heading("Fee Payment Received")}
    ${subheading(`${d.categoryName} · ${d.academicYear}`)}

    <p style="margin:0 0 20px;color:#374151;font-size:14px;">
      Hello <strong>${escHtml(d.recipientName)}</strong>,
      a fee payment of <strong>${fmtINR(d.amountPaid)}</strong>
      has been recorded for <strong>${escHtml(d.studentName)}</strong>.
    </p>

    ${infoTable(rows)}

    ${d.outstanding <= 0
      ? alertBox("Full fee has been paid. No outstanding balance.", "info")
      : alertBox(
          `Remaining balance: ${fmtINR(d.outstanding)}`,
          "warn",
        )}

    ${ctaButton("View Fee Receipt", d.loginUrl)}`;

  return htmlShell(d.schoolName, content);
}

export function feeConfirmationEmailText(d: FeeConfirmationEmailData): string {
  return [
    `Fee Payment Received — ${d.categoryName}`,
    "",
    `Hello ${d.recipientName},`,
    `Payment of ${fmtINR(d.amountPaid)} recorded for ${d.studentName}.`,
    "",
    `Status:     ${d.status}`,
    `Outstanding: ${d.outstanding > 0 ? fmtINR(d.outstanding) : "Nil"}`,
    "",
    `View receipt: ${d.loginUrl}`,
  ].join("\n");
}