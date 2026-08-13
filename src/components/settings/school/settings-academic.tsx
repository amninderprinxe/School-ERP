"use client";

import { useState, useTransition } from "react";
import { CalendarDays }            from "lucide-react";
import { updateAcademicSettings }  from "@/action/school-settings.actions";
import type { SchoolSettingsData } from "@/lib/validations/school-settings";
import {
  SettingsSection, SaveButton, Toggle, Field,
  FieldGrid, inputCls, labelCls,
}                                  from "./settings-ui";
import type { ActionResult }       from "@/action/school-settings.actions";
import { cn }                      from "@/lib/utils";

// ── Days config ───────────────────────────────────────────────────

const DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
] as const;

type DayId = (typeof DAYS)[number]["id"];

// ─────────────────────────────────────────────────────────────────

export function AcademicSection({ school }: { school: SchoolSettingsData }) {
  const [isPending, startTransition] = useTransition();
  const [result,    setResult]       = useState<ActionResult | null>(null);

  // Parse stored working days string (e.g. "MON,TUE,WED,THU,FRI")
  const parsedays = (str: string | null): Set<DayId> => {
    if (!str) return new Set(["MON", "TUE", "WED", "THU", "FRI"]);
    return new Set(str.split(",").filter(Boolean) as DayId[]);
  };

  const [workingDays,       setWorkingDays]      = useState<Set<DayId>>(
    parsedays(school.workingDays),
  );
  const [periodsPerDay,     setPeriodsPerDay]    = useState(
    school.periodsPerDay ?? 8,
  );
  const [periodDurationMin, setPeriodDuration]   = useState(
    school.periodDurationMin ?? 45,
  );
  const [attendanceMinPct,  setAttendanceMin]    = useState(
    school.attendanceMinPct ?? 75,
  );
  const [showRankInResult,  setShowRank]         = useState(
    school.showRankInResult,
  );

  const toggleDay = (day: DayId) => {
    setWorkingDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

 const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setResult(null);

  // 1. Create a new FormData instance
  const formData = new FormData();

  // 2. Append fields manually from state
  // Convert workingDays (Set or Array) to a comma-separated string e.g. "MON,TUE,WED,THU,FRI"
  formData.append("workingDays", Array.from(workingDays).join(","));
  formData.append("periodsPerDay", String(periodsPerDay));
  formData.append("periodDurationMin", String(periodDurationMin));
  formData.append("attendanceMinPct", String(attendanceMinPct));

  // 3. Trigger the Server Action
  startTransition(async () => {
    const res = await updateAcademicSettings(formData);
    setResult(res);
  });
};

  // Calculated school day duration
  const totalMinutes = periodsPerDay * periodDurationMin;
  const totalHours   = Math.floor(totalMinutes / 60);
  const totalMins    = totalMinutes % 60;

  return (
    <SettingsSection
      id="academic"
      title="Academic Configuration"
      description="Working days, class periods and attendance policies"
      icon={CalendarDays}
      accent="emerald"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">

          {/* Working Days */}
          <Field
            label="Working Days"
            hint={`${workingDays.size} day${workingDays.size !== 1 ? "s" : ""} per week selected`}
          >
            <div className="flex flex-wrap gap-2 mt-1">
              {DAYS.map(({ id, label }) => {
                const isActive = workingDays.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleDay(id)}
                    aria-pressed={isActive}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[13px] font-bold",
                      "border-2 transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {workingDays.size === 0 && (
              <p className="text-[12px] text-red-500 mt-1.5 font-medium">
                At least one working day is required
              </p>
            )}
          </Field>

          {/* Periods per day + duration */}
          <FieldGrid>
            <Field
              label="Periods per Day"
              hint={`Total school time: ${totalHours}h ${totalMins > 0 ? `${totalMins}m` : ""}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600"
                  aria-label="Periods per day"
                />
                <span className="w-10 text-center text-[15px] font-extrabold
                  text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                  {periodsPerDay}
                </span>
              </div>
            </Field>

            <Field label="Period Duration (minutes)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={20}
                  max={120}
                  step={5}
                  value={periodDurationMin}
                  onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600"
                  aria-label="Period duration in minutes"
                />
                <span className="w-14 text-center text-[15px] font-extrabold
                  text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                  {periodDurationMin}m
                </span>
              </div>
            </Field>
          </FieldGrid>

          {/* Attendance minimum */}
          <Field
            label="Minimum Attendance Requirement"
            hint="Students below this percentage will receive alerts"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={attendanceMinPct}
                  onChange={(e) => setAttendanceMin(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                  aria-label="Minimum attendance percentage"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">0%</span>
                  <span className="text-[10px] text-gray-400">50%</span>
                  <span className="text-[10px] text-gray-400">100%</span>
                </div>
              </div>
              <div className="text-center shrink-0">
                <p className={cn(
                  "text-3xl font-extrabold tabular-nums",
                  attendanceMinPct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                  attendanceMinPct >= 60 ? "text-amber-600 dark:text-amber-400"     :
                  "text-red-600 dark:text-red-400",
                )}>
                  {attendanceMinPct}%
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">threshold</p>
              </div>
            </div>
          </Field>

          {/* Summary card */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Working Days",    value: workingDays.size.toString(),           unit: "per week"  },
              { label: "Periods / Day",   value: periodsPerDay.toString(),              unit: "periods"   },
              { label: "Min. Attendance", value: `${attendanceMinPct}%`,               unit: "required"  },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center"
              >
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400
                  uppercase tracking-wider leading-none mb-1">
                  {item.label}
                </p>
                <p className="text-[20px] font-extrabold text-blue-900 dark:text-blue-300 tabular-nums">
                  {item.value}
                </p>
                <p className="text-[10px] text-blue-400 mt-0.5">{item.unit}</p>
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
            <Toggle
              checked={showRankInResult}
              onChange={setShowRank}
              label="Show rank in result card"
              description="Display student's class rank on report cards and PDFs"
            />
          </div>
        </div>

        <SaveButton isPending={isPending} result={result} />
      </form>
    </SettingsSection>
  );
}