import { prisma } from "@/lib/db";

export interface HolidayInfo {
  id:          string;
  name:        string;
  date:        Date;
  type:        string;
  description: string | null;
}

// ── Single-date lookup ─────────────────────────────────────────────

export async function getHolidayOnDate(
  schoolId: string,
  dateStr:  string,   // "YYYY-MM-DD"
): Promise<HolidayInfo | null> {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return prisma.holiday.findFirst({
    where:  { schoolId, date: d },
    select: { id: true, name: true, date: true, type: true, description: true },
  });
}

// ── Month range lookup ─────────────────────────────────────────────

export async function getHolidaysForMonth(
  schoolId: string,
  month:    string,   // "YYYY-MM"
): Promise<HolidayInfo[]> {
  const [yr, mo] = month.split("-").map(Number);
  const gte = new Date(Date.UTC(yr!, mo! - 1, 1));
  const lte = new Date(Date.UTC(yr!, mo!,     0));

  return prisma.holiday.findMany({
    where:   { schoolId, date: { gte, lte } },
    select:  { id: true, name: true, date: true, type: true, description: true },
    orderBy: { date: "asc" },
  });
}

// ── Year range lookup ─────────────────────────────────────────────

export async function getHolidaysForYear(
  schoolId: string,
  year:     number,
): Promise<HolidayInfo[]> {
  return prisma.holiday.findMany({
    where: {
      schoolId,
      date: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lte: new Date(Date.UTC(year, 11, 31)),
      },
    },
    select:  { id: true, name: true, date: true, type: true, description: true },
    orderBy: { date: "asc" },
  });
}

// ── Build a Set of "YYYY-MM-DD" strings for O(1) lookup ──────────

export function holidayDateSet(holidays: HolidayInfo[]): Set<string> {
  return new Set(
    holidays.map((h) =>
      new Date(h.date).toISOString().split("T")[0]!,
    ),
  );
}

// ── Build a Map of "YYYY-MM-DD" → HolidayInfo ─────────────────────

export function holidayDateMap(
  holidays: HolidayInfo[],
): Map<string, HolidayInfo> {
  const m = new Map<string, HolidayInfo>();
  for (const h of holidays) {
    m.set(new Date(h.date).toISOString().split("T")[0]!, h);
  }
  return m;
}

// ── Format date for display ────────────────────────────────────────

export function formatHolidayDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
    timeZone: "Asia/Kolkata",
  });
}