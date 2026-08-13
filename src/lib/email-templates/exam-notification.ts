import {
  baseTemplate, escHtml,
  h2, p, infoTable, infoRow, alertBox,
} from "./base";

export interface ExamNotificationEmailData {
  schoolName:   string;
  recipientName: string;
  examName:     string;
  examType:     string;
  className:    string;
  startDate:    string | null;
  endDate:      string | null;
  createdByName: string;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  UNIT_TEST:  "Unit Test",
  MID_TERM:   "Mid Term",
  FINAL:      "Final Exam",
  ASSIGNMENT: "Assignment",
  PRACTICAL:  "Practical",
  OTHER:      "Other",
};

export function examNotificationEmail(
  data: ExamNotificationEmailData,
): string {
  const typeLabel = EXAM_TYPE_LABELS[data.examType] ?? data.examType;

  const content = `
    ${alertBox("📝 A new exam has been scheduled for your class.", "blue")}
    ${h2("New Exam Scheduled")}
    ${p(`Dear <strong>${escHtml(data.recipientName)}</strong>,`)}
    ${p(`A new exam has been scheduled for <strong>${escHtml(data.className)}</strong>.
         Here are the details:`)}

    ${infoTable(
      infoRow("Exam Name",  `<strong>${escHtml(data.examName)}</strong>`) +
      infoRow("Type",       escHtml(typeLabel)) +
      infoRow("Class",      escHtml(data.className)) +
      (data.startDate ? infoRow("Start Date", escHtml(data.startDate)) : "") +
      (data.endDate   ? infoRow("End Date",   escHtml(data.endDate))   : "") +
      infoRow("Scheduled By", escHtml(data.createdByName)),
    )}

    ${p(`Please check your school portal for more details about the syllabus
         and any additional instructions from your teacher.`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function examNotificationSubject(examName: string, className: string): string {
  return `New Exam Scheduled: ${examName} — ${className}`;
}