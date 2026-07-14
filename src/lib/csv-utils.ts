// ── CSV parser ────────────────────────────────────────────────────

export function parseCSVText(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(parseLine).filter((row) => row.some((c) => c.length > 0));
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current   = "";
  let inQuotes  = false;

  for (let i = 0; i < line.length; i++) {
    const ch   = line[i]!;
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++; }
      else                          { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Header normaliser ─────────────────────────────────────────────

export function normaliseHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, "");
}

// ── Map header row → field indices ───────────────────────────────

export function buildHeaderMap(
  headers: string[],
  expected: string[],
): Map<string, number> {
  const map = new Map<string, number>();
  const norm = headers.map(normaliseHeader);
  for (const key of expected) {
    const idx = norm.indexOf(normaliseHeader(key));
    if (idx !== -1) map.set(key, idx);
  }
  return map;
}

// ── Template CSV strings ──────────────────────────────────────────

export const STUDENT_HEADERS = [
  "name", "email", "gender", "phone",
  "rollNumber", "admissionNo", "dateOfBirth", "bloodGroup",
  "className", "sectionName",
];

export const STUDENT_TEMPLATE_CSV =
  STUDENT_HEADERS.join(",") + "\n" +
  "Aarav Mehta,aarav@school.edu,MALE,+91 9876543210,10A-001,ADM-001,2009-03-15,B+,Grade 10,A\n" +
  "Priya Singh,priya@school.edu,FEMALE,,,,,,Grade 10,A";

export const TEACHER_HEADERS = [
  "name", "email", "gender", "phone",
  "employeeCode", "qualification", "joiningDate",
];

export const TEACHER_TEMPLATE_CSV =
  TEACHER_HEADERS.join(",") + "\n" +
  "Ravi Sharma,ravi@school.edu,MALE,+91 9876543210,TCH-001,M.Sc Mathematics,2020-06-01\n" +
  "Anjali Nair,anjali@school.edu,FEMALE,+91 9876543211,TCH-002,B.Ed English,";

// ── Trigger browser download of a CSV string ──────────────────────

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}