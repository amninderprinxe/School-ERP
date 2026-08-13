"use client";

import { useState }  from "react";
import { motion }    from "framer-motion";
import { Clock, CalendarDays } from "lucide-react";
import { cn }        from "@/lib/utils";
import type { StudentProfileData } from "./types";

const DAYS_ORDER = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
};

const SUBJECT_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-900",
  "bg-purple-50 border-purple-200 text-purple-900",
  "bg-emerald-50 border-emerald-200 text-emerald-900",
  "bg-amber-50 border-amber-200 text-amber-900",
  "bg-rose-50 border-rose-200 text-rose-900",
  "bg-indigo-50 border-indigo-200 text-indigo-900",
  "bg-teal-50 border-teal-200 text-teal-900",
  "bg-orange-50 border-orange-200 text-orange-900",
];

export function TabTimetable({ data }: { data: StudentProfileData }) {
  const { periods } = data;
  const today       = new Date().getDay();
  const todayDow    = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][today];
  const [activeDay, setActiveDay] = useState(
    DAYS_ORDER.includes(todayDow as any) ? todayDow! : "MONDAY",
  );

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" aria-hidden />
        <p className="text-sm font-medium text-gray-500">No timetable assigned</p>
        <p className="text-xs text-gray-400 mt-1">
          Contact your school admin to set up the timetable.
        </p>
      </div>
    );
  }

  // Subject → color index
  const subjectColorMap = new Map<string, number>();
  let colorIdx = 0;
  for (const p of periods) {
    if (p.subject && !subjectColorMap.has(p.subject.name)) {
      subjectColorMap.set(p.subject.name, colorIdx++ % SUBJECT_COLORS.length);
    }
  }

  const activeDayPeriods = periods
    .filter((p) => p.dayOfWeek === activeDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const activeDays = DAYS_ORDER.filter((d) =>
    periods.some((p) => p.dayOfWeek === d),
  );

  return (
    <div className="space-y-5">

      {/* ── Subject legend ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {Array.from(subjectColorMap.entries()).map(([name, ci]) => (
          <span
            key={name}
            className={cn(
              "px-2.5 py-1 text-[11px] font-semibold rounded-full border",
              SUBJECT_COLORS[ci % SUBJECT_COLORS.length],
            )}
          >
            {name}
          </span>
        ))}
      </div>

      {/* ── Day tab strip ──────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {activeDays.map((day) => {
          const isToday  = day === todayDow;
          const isActive = day === activeDay;
          const count    = periods.filter((p) => p.dayOfWeek === day).length;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={cn(
                "flex flex-col items-center px-5 py-2.5 rounded-xl",
                "text-[13px] font-semibold border transition-all duration-150 shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              {DAY_LABELS[day]?.slice(0, 3)}
              <span className={cn(
                "text-[10px] mt-0.5 font-medium",
                isActive ? "text-blue-200" : "text-gray-400",
              )}>
                {count}p
                {isToday && <span className={cn("ml-1", isActive ? "text-blue-200" : "text-blue-500")}>•</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Day view ──────────────────────────────────────── */}
      <motion.div
        key={activeDay}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0  }}
        transition={{ duration: 0.18  }}
        className="space-y-3"
      >
        {activeDayPeriods.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center">
            <p className="text-sm text-gray-400">No periods on {DAY_LABELS[activeDay]}</p>
          </div>
        ) : (
          activeDayPeriods.map((p) => {
            const colorClass = p.subject
              ? SUBJECT_COLORS[subjectColorMap.get(p.subject.name) ?? 0]
              : "bg-gray-50 border-gray-200 text-gray-600";

            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl border",
                  colorClass,
                )}
              >
                {/* Period number */}
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center
                  justify-center shrink-0">
                  <span className="text-sm font-black opacity-80">
                    P{p.periodNumber}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold leading-snug">
                    {p.subject?.name ?? "Free Period"}
                    {p.subject?.code && (
                      <span className="ml-1.5 text-[11px] font-mono opacity-60">
                        ({p.subject.code})
                      </span>
                    )}
                  </p>
                  {p.teacherProfile && (
                    <p className="text-[12px] opacity-75 mt-0.5">
                      {p.teacherProfile.user.name}
                    </p>
                  )}
                </div>

                {/* Time */}
                {(p.startTime || p.endTime) && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 opacity-60" aria-hidden />
                    <span className="text-[12px] font-semibold font-mono opacity-80">
                      {p.startTime}
                      {p.startTime && p.endTime ? "–" : ""}
                      {p.endTime}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}