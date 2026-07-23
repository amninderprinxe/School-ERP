"use client";

import { useState, useMemo } from "react";
import { Clock, CalendarDays } from "lucide-react";
import {
  DAYS_OF_WEEK,
  DAY_LABEL,
  DAY_SHORT,
  MAX_PERIODS,
  type DayOfWeekType,
} from "@/lib/validations/timetable";

// ── Shared types ──────────────────────────────────────────────────
export interface TimetablePeriod {
  id:              string;
  dayOfWeek:       DayOfWeekType;
  periodNumber:    number;
  startTime:       string | null;
  endTime:         string | null;
  subjectId:       string | null;
  subjectName:     string | null;
  subjectCode:     string | null;
  teacherName:     string | null;
}

export interface TimetableSubject {
  id:   string;
  name: string;
}

interface Props {
  periods:      TimetablePeriod[];
  subjects:     TimetableSubject[];
  sectionLabel: string;
  showHeader?:  boolean;
}

// ── Same palette as TimetableGrid ─────────────────────────────────
const COLORS = [
  "bg-blue-100   border-blue-300   text-blue-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-green-100  border-green-300  text-green-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-pink-100   border-pink-300   text-pink-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-teal-100   border-teal-300   text-teal-900",
  "bg-amber-100  border-amber-300  text-amber-900",
  "bg-red-100    border-red-300    text-red-900",
  "bg-cyan-100   border-cyan-300   text-cyan-900",
];

// ─────────────────────────────────────────────────────────────────
export function TimetableView({
  periods,
  subjects,
  sectionLabel,
  showHeader = true,
}: Props) {
  const [showSat, setShowSat] = useState(false);
  const activeDays = showSat
    ? DAYS_OF_WEEK
    : DAYS_OF_WEEK.slice(0, 5);

  // ── Period lookup ─────────────────────────────────────────────
  const periodMap = useMemo(() => {
    const m = new Map<string, TimetablePeriod>();
    for (const p of periods) {
      m.set(`${p.dayOfWeek}-${p.periodNumber}`, p);
    }
    return m;
  }, [periods]);

  // ── Subject → color ───────────────────────────────────────────
  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    subjects.forEach((s, i) => {
      m.set(s.id, COLORS[i % COLORS.length]!);
    });
    return m;
  }, [subjects]);

  const filledCount = periods.filter((p) => p.subjectId).length;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showHeader && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span>{sectionLabel}</span>
            <span className="text-gray-300">·</span>
            <span>
              {filledCount} period
              {filledCount !== 1 ? "s" : ""} scheduled
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowSat((p) => !p)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5
            text-xs font-semibold rounded-lg border transition-colors
            ${showSat
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
        >
          {showSat ? "Hide Saturday" : "Show Saturday"}
        </button>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">

            {/* Day headers */}
            <thead>
              <tr>
                {/* Period column */}
                <th className="w-16 px-3 py-3.5 bg-gray-50 border-b
                  border-r border-gray-100 text-xs font-semibold text-gray-400
                  uppercase tracking-wide text-center sticky left-0 z-10">
                  P#
                </th>
                {activeDays.map((day) => (
                  <th
                    key={day}
                    className="min-w-[130px] px-3 py-3.5 bg-gray-50
                      border-b border-r last:border-r-0 border-gray-100
                      text-xs font-semibold text-gray-700 uppercase
                      tracking-wide text-center"
                  >
                    <span className="hidden sm:block">{DAY_LABEL[day]}</span>
                    <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Period rows */}
            <tbody>
              {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map(
                (periodNum) => (
                  <tr key={periodNum}>

                    {/* Period number */}
                    <td className="px-3 py-2 bg-gray-50 border-b
                      last:border-b-0 border-r border-gray-100 text-center
                      sticky left-0 z-10">
                      <span className="text-xs font-bold text-gray-500">
                        P{periodNum}
                      </span>
                    </td>

                    {/* Day cells */}
                    {activeDays.map((day) => {
                      const period = periodMap.get(`${day}-${periodNum}`);
                      const color  = period?.subjectId
                        ? (colorMap.get(period.subjectId) ??
                          "bg-gray-100 border-gray-300 text-gray-800")
                        : null;

                      return (
                        <td
                          key={day}
                          className="p-1.5 border-b last:border-b-0
                            border-r last:border-r-0 border-gray-100"
                        >
                          {period?.subjectId && color ? (
                            /* ── Filled cell ─────────────────── */
                            <div
                              className={`rounded-lg border-2 p-2
                                min-h-[68px] flex flex-col gap-0.5 ${color}`}
                            >
                              <p className="text-xs font-bold leading-tight
                                line-clamp-1">
                                {period.subjectName}
                              </p>
                              {period.subjectCode && (
                                <p className="text-[10px] font-mono opacity-70
                                  leading-none">
                                  {period.subjectCode}
                                </p>
                              )}
                              {period.teacherName && (
                                <p className="text-[10px] opacity-75 mt-0.5
                                  line-clamp-1">
                                  {period.teacherName}
                                </p>
                              )}
                              {(period.startTime || period.endTime) && (
                                <p className="text-[10px] opacity-60 mt-auto
                                  flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  {period.startTime ?? ""}
                                  {period.startTime && period.endTime ? "–" : ""}
                                  {period.endTime ?? ""}
                                </p>
                              )}
                            </div>
                          ) : (
                            /* ── Empty cell ─────────────────── */
                            <div className="min-h-[68px] rounded-lg border-2
                              border-dashed border-gray-100 flex items-center
                              justify-center">
                              <span className="text-[10px] text-gray-200">
                                —
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
