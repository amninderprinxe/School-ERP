import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import {
  DAYS_OF_WEEK,
  DAY_LABEL,
  DAY_SHORT,
  type DayOfWeekType,
}                        from "@/lib/validations/timetable";
import {
  CalendarDays,
  Clock,
  BookMarked,
  Layers,
  BookOpen,
  GraduationCap,
}                        from "lucide-react";

export const metadata = { title: "My Timetable" };

// ── Color palette per subject ─────────────────────────────────────
const SUBJECT_COLORS = [
  { bg: "bg-blue-100",   text: "text-blue-900",   border: "border-blue-300",   badge: "bg-blue-600"   },
  { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300", badge: "bg-purple-600" },
  { bg: "bg-green-100",  text: "text-green-900",  border: "border-green-300",  badge: "bg-green-600"  },
  { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300", badge: "bg-orange-600" },
  { bg: "bg-pink-100",   text: "text-pink-900",   border: "border-pink-300",   badge: "bg-pink-600"   },
  { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-300", badge: "bg-indigo-600" },
  { bg: "bg-teal-100",   text: "text-teal-900",   border: "border-teal-300",   badge: "bg-teal-600"   },
  { bg: "bg-amber-100",  text: "text-amber-900",  border: "border-amber-300",  badge: "bg-amber-600"  },
  { bg: "bg-red-100",    text: "text-red-900",    border: "border-red-300",    badge: "bg-red-600"    },
  { bg: "bg-cyan-100",   text: "text-cyan-900",   border: "border-cyan-300",   badge: "bg-cyan-600"   },
];

type ColorEntry = (typeof SUBJECT_COLORS)[number];

// ── Typed period row ──────────────────────────────────────────────
interface TeacherPeriod {
  id:           string;
  dayOfWeek:    DayOfWeekType;
  periodNumber: number;
  startTime:    string | null;
  endTime:      string | null;
  subjectName:  string;
  subjectCode:  string | null;
  subjectId:    string;
  className:    string;
  sectionName:  string;
}

export default async function TeacherTimetablePage() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;

  // ── Teacher profile ───────────────────────────────────────────
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
  });

  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Teacher profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  // ── All periods assigned to this teacher ──────────────────────
  const rawPeriods = await prisma.period.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
      schoolId,
    },
    include: {
      subject: true,
      section: { include: { class: true } },
    },
    orderBy: [
      { dayOfWeek:    "asc" },
      { periodNumber: "asc" },
    ],
  });

  // ── Map to typed structure ────────────────────────────────────
  const periods: TeacherPeriod[] = rawPeriods
    .filter((p) => p.subject)   // skip any slot where subject was deleted
    .map((p) => ({
      id:           p.id,
      dayOfWeek:    p.dayOfWeek as DayOfWeekType,
      periodNumber: p.periodNumber,
      startTime:    p.startTime,
      endTime:      p.endTime,
      subjectName:  p.subject!.name,
      subjectCode:  p.subject!.code,
      subjectId:    p.subjectId!,
      className:    p.section.class.name,
      sectionName:  p.section.name,
    }));

  // ── Build de-duplicated subject → color map ───────────────────
  const subjectIds    = Array.from(new Set(periods.map((p) => p.subjectId)));
  const subjectColorMap = new Map<string, ColorEntry>(
    subjectIds.map((id, i) => [
      id,
      SUBJECT_COLORS[i % SUBJECT_COLORS.length]!,
    ]),
  );

  // ── Group by day ──────────────────────────────────────────────
  const byDay = new Map<DayOfWeekType, TeacherPeriod[]>();
  for (const day of DAYS_OF_WEEK) byDay.set(day, []);
  for (const p of periods)        byDay.get(p.dayOfWeek)?.push(p);

  // ── Days that actually have any periods ───────────────────────
  const activeDays = DAYS_OF_WEEK.filter(
    (d) => (byDay.get(d)?.length ?? 0) > 0,
  );

  // ── Summary stats ─────────────────────────────────────────────
  const totalPeriods   = periods.length;
  const uniqueSubjects = subjectIds.length;
  const uniqueSections = new Set(
    periods.map((p) => `${p.className}-${p.sectionName}`),
  ).size;
  const busiestDay     = activeDays.reduce<{
    day: DayOfWeekType | null;
    count: number;
  }>(
    (best, d) => {
      const cnt = byDay.get(d)?.length ?? 0;
      return cnt > best.count ? { day: d, count: cnt } : best;
    },
    { day: null, count: 0 },
  );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your weekly teaching schedule across all sections
        </p>
      </div>

      {/* ── Summary strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Periods",
            value: totalPeriods,
            icon:  CalendarDays,
            color: "text-indigo-700",
            bg:    "bg-indigo-50",
          },
          {
            label: "Subjects",
            value: uniqueSubjects,
            icon:  BookMarked,
            color: "text-blue-700",
            bg:    "bg-blue-50",
          },
          {
            label: "Sections",
            value: uniqueSections,
            icon:  Layers,
            color: "text-purple-700",
            bg:    "bg-purple-50",
          },
          {
            label: "Busiest Day",
            value: busiestDay.day
              ? `${DAY_SHORT[busiestDay.day]} (${busiestDay.count})`
              : "—",
            icon:  GraduationCap,
            color: "text-emerald-700",
            bg:    "bg-emerald-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm
              p-4 flex items-start gap-3"
          >
            <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center
              justify-center shrink-0 mt-0.5`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${item.color}`}>
                {item.value}
              </p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── No periods assigned ───────────────────────────────── */}
      {totalPeriods === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No periods assigned yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Your school admin hasn&apos;t assigned you to any timetable
            slots yet. Check back after the timetable is set up.
          </p>
        </div>
      )}

      {/* ── Subject legend ────────────────────────────────────── */}
      {totalPeriods > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjectIds.map((id) => {
            const period = periods.find((p) => p.subjectId === id)!;
            const color  = subjectColorMap.get(id)!;
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-semibold rounded-full
                  ${color.bg} ${color.text}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${color.badge}`}
                />
                {period.subjectName}
                {period.subjectCode && (
                  <span className="font-mono opacity-70">
                    {period.subjectCode}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Day-wise schedule ────────────────────────────────── */}
      {totalPeriods > 0 && (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayPeriods = byDay.get(day) ?? [];
            const hasPeriods = dayPeriods.length > 0;

            return (
              <div
                key={day}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden
                  ${hasPeriods
                    ? "border-gray-100"
                    : "border-gray-50 opacity-50"}`}
              >
                {/* Day header */}
                <div
                  className={`flex items-center justify-between px-5 py-3.5
                    border-b
                    ${hasPeriods
                      ? "bg-gray-50 border-gray-100"
                      : "bg-gray-50/50 border-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Day pill */}
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center
                        justify-center text-xs font-black shrink-0
                        ${hasPeriods
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-200 text-gray-400"}`}
                    >
                      {DAY_SHORT[day]}
                    </span>

                    {/* Full day name */}
                    <div>
                      <p className={`font-bold text-sm ${
                        hasPeriods ? "text-gray-900" : "text-gray-400"
                      }`}>
                        {DAY_LABEL[day]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {hasPeriods
                          ? `${dayPeriods.length} period${dayPeriods.length !== 1 ? "s" : ""}`
                          : "No periods"}
                      </p>
                    </div>
                  </div>

                  {/* Day total badge */}
                  {hasPeriods && (
                    <span className="px-2.5 py-1 text-xs font-semibold
                      bg-blue-50 text-blue-700 rounded-full">
                      {dayPeriods.length} class
                      {dayPeriods.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>

                {/* Period rows */}
                {hasPeriods && (
                  <div className="divide-y divide-gray-50">
                    {dayPeriods.map((period, idx) => {
                      const color = subjectColorMap.get(period.subjectId)!;

                      return (
                        <div
                          key={period.id}
                          className="flex items-stretch gap-0
                            hover:bg-gray-50/60 transition-colors"
                        >
                          {/* Period number strip */}
                          <div className={`flex items-center justify-center
                            w-14 shrink-0 border-r border-gray-100
                            ${idx % 2 === 0 ? "bg-gray-50/80" : "bg-white"}`}>
                            <div className="text-center">
                              <p className="text-xs font-black text-gray-400">
                                P{period.periodNumber}
                              </p>
                            </div>
                          </div>

                          {/* Color accent bar */}
                          <div
                            className={`w-1.5 shrink-0 ${color.badge}`}
                          />

                          {/* Period content */}
                          <div className="flex flex-1 flex-wrap items-center
                            gap-x-4 gap-y-1 px-4 py-3.5 min-w-0">

                            {/* Subject */}
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <div className={`w-8 h-8 rounded-lg flex
                                items-center justify-center shrink-0
                                ${color.bg} ${color.text}`}>
                                <BookMarked className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900
                                  truncate leading-tight">
                                  {period.subjectName}
                                </p>
                                {period.subjectCode && (
                                  <p className="text-[11px] font-mono
                                    text-gray-400 leading-none mt-0.5">
                                    {period.subjectCode}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Class + Section */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-gray-400
                                  shrink-0" />
                                <span className="text-xs font-medium
                                  text-gray-600">
                                  {period.className}
                                </span>
                              </div>
                              <span className="text-gray-300 text-xs">·</span>
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-gray-400
                                  shrink-0" />
                                <span className="text-xs font-medium
                                  text-gray-600">
                                  Section {period.sectionName}
                                </span>
                              </div>
                            </div>

                            {/* Time */}
                            {(period.startTime || period.endTime) && (
                              <div className="flex items-center gap-1.5
                                text-xs text-gray-500 ml-auto">
                                <Clock className="w-3.5 h-3.5 text-gray-400
                                  shrink-0" />
                                <span className="font-mono tabular-nums">
                                  {period.startTime ?? ""}
                                  {period.startTime && period.endTime
                                    ? " – "
                                    : ""}
                                  {period.endTime ?? ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Free day placeholder */}
                {!hasPeriods && (
                  <div className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex
                      items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-300">No classes scheduled</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Weekly overview grid (compact) ───────────────────── */}
      {totalPeriods > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Weekly Overview
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Compact grid — your periods at a glance
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">

              {/* Day header row */}
              <thead>
                <tr>
                  <th className="w-14 px-3 py-3 bg-gray-50 border-b
                    border-r border-gray-100 text-xs font-semibold
                    text-gray-400 text-center sticky left-0">
                    P#
                  </th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th
                      key={day}
                      className="min-w-[110px] px-2 py-3 bg-gray-50 border-b
                        border-r last:border-r-0 border-gray-100 text-xs
                        font-semibold text-gray-700 text-center"
                    >
                      <span className="hidden sm:block">{DAY_LABEL[day]}</span>
                      <span className="sm:hidden">{DAY_SHORT[day]}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((pNum) => (
                  <tr key={pNum}>
                    {/* Period number */}
                    <td className="px-3 py-2 bg-gray-50 border-b
                      last:border-b-0 border-r border-gray-100 text-center
                      sticky left-0">
                      <span className="text-xs font-bold text-gray-400">
                        P{pNum}
                      </span>
                    </td>

                    {/* Day cells */}
                    {DAYS_OF_WEEK.map((day) => {
                      const period = byDay
                        .get(day)
                        ?.find((p) => p.periodNumber === pNum);

                      if (!period) {
                        return (
                          <td
                            key={day}
                            className="p-1 border-b last:border-b-0
                              border-r last:border-r-0 border-gray-50"
                          >
                            <div className="h-12 rounded-lg border border-dashed
                              border-gray-100 flex items-center justify-center">
                              <span className="text-[10px] text-gray-200">—</span>
                            </div>
                          </td>
                        );
                      }

                      const color = subjectColorMap.get(period.subjectId)!;

                      return (
                        <td
                          key={day}
                          className="p-1 border-b last:border-b-0
                            border-r last:border-r-0 border-gray-50"
                        >
                          <div
                            className={`h-12 rounded-lg border-2 px-2 py-1
                              flex flex-col justify-center
                              ${color.bg} ${color.text} ${color.border}`}
                          >
                            <p className="text-[11px] font-bold leading-tight
                              truncate">
                              {period.subjectName}
                            </p>
                            <p className="text-[10px] opacity-70 leading-tight
                              truncate mt-0.5">
                              {period.className}-{period.sectionName}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}