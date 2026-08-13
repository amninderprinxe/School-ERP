import {
  baseTemplate, escHtml,
  h2, p, infoTable, infoRow, alertBox,
} from "./base";

export interface AttendanceAlertEmailData {
  schoolName:    string;
  childName:     string;
  className:     string | null;
  sectionName:   string | null;
  date:          string;   // formatted "DD Mon YYYY"
  status:        string;   // "ABSENT" | "LATE" | "HALF_DAY"
  markedByName:  string;
  remarks?:      string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ABSENT:   "Absent",
  LATE:     "Late",
  HALF_DAY: "Half Day",
};

const STATUS_COLOR: Record<string, "red" | "amber" | "blue"> = {
  ABSENT:   "red",
  LATE:     "amber",
  HALF_DAY: "blue",
};

export function attendanceAlertEmail(data: AttendanceAlertEmailData): string {
  const label = STATUS_LABEL[data.status] ?? data.status;
  const color = STATUS_COLOR[data.status] ?? "amber";

  const sectionLabel = data.className && data.sectionName
    ? `${data.className} — Section ${data.sectionName}`
    : data.className ?? "—";

  const content = `
    ${alertBox(
      `📋 Attendance Update for <strong>${escHtml(data.childName)}</strong>`,
      color,
    )}
    ${h2("Attendance Notification")}
    ${p(`This is to inform you that the student <strong>${escHtml(data.childName)}</strong>
         was marked <strong>${escHtml(label)}</strong> in school today.`)}

    ${infoTable(
      infoRow("Student",  `<strong>${escHtml(data.childName)}</strong>`) +
      infoRow("Class",    escHtml(sectionLabel)) +
      infoRow("Date",     escHtml(data.date)) +
      infoRow("Status",   `<span style="background:${color === "red" ? "#fee2e2" : color === "amber" ? "#fef3c7" : "#eff6ff"};
        color:${color === "red" ? "#991b1b" : color === "amber" ? "#92400e" : "#1e40af"};
        padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">
        ${escHtml(label)}</span>`) +
      infoRow("Marked By", escHtml(data.markedByName)) +
      (data.remarks ? infoRow("Remarks", `<em>${escHtml(data.remarks)}</em>`) : ""),
    )}

    ${p(`If you have any questions about your child's attendance,
         please contact the school office or reach out to the class teacher.`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function attendanceAlertSubject(childName: string, status: string): string {
  const label = STATUS_LABEL[status] ?? status;
  return `Attendance Alert: ${childName} marked ${label} today`;
}