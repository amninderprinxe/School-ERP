import {
  baseTemplate, escHtml,
  h2, p, infoTable, infoRow, alertBox,
} from "./base";

export interface FeeReminderEmailData {
  schoolName:    string;
  recipientName: string;
  studentName:   string;
  categoryName:  string;
  academicYear:  string;
  totalAmount:   string;   // formatted "₹12,000"
  amountPaid:    string;
  outstanding:   string;
  dueDate?:      string | null;
  status:        string;
}

export function feeReminderEmail(data: FeeReminderEmailData): string {
  const isPending = data.status === "PENDING";
  const color = isPending ? "amber" : "blue";

  const content = `
    ${alertBox(
      `💳 Fee payment reminder for <strong>${escHtml(data.studentName)}</strong>.`,
      color,
    )}
    ${h2("Fee Payment Reminder")}
    ${p(`Dear <strong>${escHtml(data.recipientName)}</strong>,`)}
    ${p(`This is a reminder regarding the outstanding fee for
         <strong>${escHtml(data.studentName)}</strong>.`)}

    ${infoTable(
      infoRow("Fee Category",  `<strong>${escHtml(data.categoryName)}</strong>`) +
      infoRow("Academic Year", escHtml(data.academicYear)) +
      infoRow("Total Fee",     `<strong>${escHtml(data.totalAmount)}</strong>`) +
      infoRow("Amount Paid",   `<span style="color:#15803d;">${escHtml(data.amountPaid)}</span>`) +
      infoRow("Outstanding",   `<span style="color:#b91c1c;font-weight:bold;">
        ${escHtml(data.outstanding)}</span>`) +
      (data.dueDate ? infoRow("Due Date", escHtml(data.dueDate)) : ""),
    )}

    ${p(`Please visit the school office or log in to the school portal to
         complete your payment and avoid any late fees.`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function feeReminderSubject(
  studentName:  string,
  categoryName: string,
): string {
  return `Fee Payment Reminder: ${categoryName} — ${studentName}`;
}