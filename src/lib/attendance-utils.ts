import type { AttendanceStatus } from "@prisma/client";

export interface AttendanceSummary {
  total:      number;
  present:    number;
  absent:     number;
  late:       number;
  halfDay:    number;
  percentage: number;
}

// Present + Late = full day; HalfDay = 0.5; Absent = 0
export function calcSummary(
  records: { status: AttendanceStatus }[],
): AttendanceSummary {
  const total    = records.length;
  const present  = records.filter((r) => r.status === "PRESENT").length;
  const absent   = records.filter((r) => r.status === "ABSENT").length;
  const late     = records.filter((r) => r.status === "LATE").length;
  const halfDay  = records.filter((r) => r.status === "HALF_DAY").length;
  const percentage =
    total === 0
      ? 0
      : Math.round(((present + late + halfDay * 0.5) / total) * 100);
  return { total, present, absent, late, halfDay, percentage };
}

// "YYYY-MM" for today's month
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Guard for safe URL param usage
export function isValidMonth(val: unknown): val is string {
  return typeof val === "string" && /^\d{4}-\d{2}$/.test(val);
}

// Prisma-compatible date range for a given "YYYY-MM"
export function getMonthRange(monthStr: string): { gte: Date; lte: Date } {
  const [yr, mo] = monthStr.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(yr!, mo! - 1, 1)),
    lte: new Date(Date.UTC(yr!, mo!,    0)), // day 0 of next month = last day
  };
}

// "March 2024"
export function formatMonth(monthStr: string): string {
  const [yr, mo] = monthStr.split("-").map(Number);
  return new Date(yr!, mo! - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year:  "numeric",
  });
}

// +1 or -1 month
export function shiftMonth(monthStr: string, dir: 1 | -1): string {
  const [yr, mo] = monthStr.split("-").map(Number);
  const d = new Date(yr!, mo! - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Tailwind badge classes based on percentage
export function pctBadge(pct: number): string {
  if (pct >= 90) return "bg-green-50 border-green-200 text-green-700";
  if (pct >= 75) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

export function pctLabel(pct: number): string {
  if (pct >= 90) return "Excellent attendance";
  if (pct >= 75) return "Acceptable — try to improve";
  return "⚠️ Below 75% — at risk";
}