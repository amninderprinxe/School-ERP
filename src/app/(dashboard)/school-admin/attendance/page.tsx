import { Suspense }          from "react";
import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import Link                  from "next/link";
import { MonthFilter }       from "@/components/attendance/month-filter";
import {
  getCurrentMonth,
  isValidMonth,
  getMonthRange,
  formatMonth,
  pctBadge,
}                            from "@/lib/attendance-utils";
import {
  CalendarCheck,
  Download,
  Users,
  AlertTriangle,
  FileBarChart,
}                            from "lucide-react";

export const metadata = { title: "Attendance Overview" };

interface Props {
  searchParams: Promise<{
    sectionId?: string;
    month?:     string;
    filter?:    string;   // "at-risk" | undefined
  }>;
}

// ── Inline attendance percentage calculation ───────────────────────
function computePct(
  present: number,
  late:    number,
  halfDay: number,
  total:   number,
): number {
  if (total === 0) return 0;
  return Math.round(((present + late + halfDay * 0.5) / total) * 100);
}

export default async function SchoolAdminAttendancePage({
  searchParams,
}: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;

  const month     = isValidMonth(sp.month) ? sp.month : getCurrentMonth();
  const { gte, lte } = getMonthRange(month);
  const sectionId  = sp.sectionId ?? "";
  const showAtRisk = sp.filter === "at-risk";

  // ── Load all sections for this school ─────────────────────────
  const sections = await prisma.section.findMany({
    where:   { schoolId },
    include: { class: true },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  const selectedSection = sections.find((s) => s.id === sectionId);

  // ── Per-student summary ───────────────────────────────────────
  type StudentSummary = {
    id:          string;
    name:        string;
    rollNumber:  string | null;
    present:     number;
    absent:      number;
    late:        number;
    halfDay:     number;
    total:       number;
    percentage:  number;
  };

  let summaries: StudentSummary[] = [];

  if (selectedSection) {
    const students = await prisma.studentProfile.findMany({
      where:   { sectionId, user: { schoolId, isActive: true } },
      include: { user: { select: { name: true } } },
      orderBy: [{ rollNumber: "asc" }, { user: { name: "asc" } }],
    });

    const records = await prisma.attendance.findMany({
      where: {
        sectionId,
        schoolId,
        date:             { gte, lte },
        studentProfileId: { in: students.map((s) => s.id) },
      },
      select: { studentProfileId: true, status: true },
    });

    // Tally by student
    const tally = new Map<
      string,
      { present: number; absent: number; late: number; halfDay: number }
    >();
    for (const s of students) {
      tally.set(s.id, { present: 0, absent: 0, late: 0, halfDay: 0 });
    }
    for (const r of records) {
      const c = tally.get(r.studentProfileId);
      if (!c) continue;
      if      (r.status === "PRESENT")  c.present++;
      else if (r.status === "ABSENT")   c.absent++;
      else if (r.status === "LATE")     c.late++;
      else if (r.status === "HALF_DAY") c.halfDay++;
    }

    summaries = students.map((s) => {
      const c   = tally.get(s.id) ?? { present: 0, absent: 0, late: 0, halfDay: 0 };
      const total = c.present + c.absent + c.late + c.halfDay;
      return {
        id:         s.id,
        name:       s.user.name,
        rollNumber: s.rollNumber,
        ...c,
        total,
        percentage: computePct(c.present, c.late, c.halfDay, total),
      };
    });
  }

  // ── At-risk counts and filtering ──────────────────────────────
  const atRiskCount   = summaries.filter(
    (s) => s.total > 0 && s.percentage < 75,
  ).length;
  const displayed     = showAtRisk
    ? summaries.filter((s) => s.total > 0 && s.percentage < 75)
    : summaries;

  const avgPct =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((a, s) => a + s.percentage, 0) / summaries.length,
        )
      : 0;

  // ── CSV export URL ────────────────────────────────────────────
  const csvParams = new URLSearchParams({ month });
  if (sectionId) csvParams.set("sectionId", sectionId);
  const csvUrl = `/api/attendance/export?${csvParams.toString()}`;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monthly summary — {formatMonth(month)}
          </p>
        </div>
        <Link
          href={`/school-admin/attendance/report?sectionId=${sectionId}&month=${month}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
            font-semibold text-gray-700 bg-white border border-gray-200
            hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
        >
          <FileBarChart className="w-4 h-4" />
          Detailed Report
        </Link>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Section — GET form */}
          <form method="GET" className="flex flex-wrap gap-3 flex-1 min-w-0">
            {/* Preserve month + filter across section change */}
            <input type="hidden" name="month"  value={month} />
            {showAtRisk && (
              <input type="hidden" name="filter" value="at-risk" />
            )}
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-gray-500
                uppercase tracking-wide mb-1.5">
                Section
              </label>
              <select
                name="sectionId"
                defaultValue={sectionId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                  text-sm bg-white focus:outline-none focus:ring-2
                  focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— Select section —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                  text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Load
              </button>
            </div>
          </form>

          {/* Month navigator */}
          <div>
            <label className="block text-xs font-semibold text-gray-500
              uppercase tracking-wide mb-1.5">
              Month
            </label>
            <Suspense
              fallback={
                <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
              }
            >
              <MonthFilter
                currentMonth={month}
                preserveKeys={["sectionId", "filter"]}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── No section selected ──────────────────────────────── */}
      {!selectedSection && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No section selected
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select a section above to view the monthly attendance summary.
          </p>
        </div>
      )}

      {/* ── Stats cards ──────────────────────────────────────── */}
      {selectedSection && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Students",
              value: summaries.length,
              color: "text-gray-900",
            },
            {
              label: "Average Attendance",
              value: `${avgPct}%`,
              color: avgPct >= 75 ? "text-emerald-700" : "text-red-600",
            },
            {
              label: "At Risk (< 75%)",
              value: atRiskCount,
              color: atRiskCount > 0 ? "text-red-600" : "text-emerald-700",
            },
            {
              label: "No Records",
              value: summaries.filter((s) => s.total === 0).length,
              color: "text-amber-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm
                px-4 py-3 text-center"
            >
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary table ────────────────────────────────────── */}
      {selectedSection && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">

          {/* Table toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap
            items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {selectedSection.class.name} — Section {selectedSection.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatMonth(month)} · {displayed.length} student
                {displayed.length !== 1 ? "s" : ""}
                {showAtRisk && " (at-risk only)"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* At-risk toggle */}
              <Link
                href={`/school-admin/attendance?sectionId=${sectionId}&month=${month}${
                  showAtRisk ? "" : "&filter=at-risk"
                }`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-semibold rounded-lg transition-colors
                  ${showAtRisk
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                At Risk ({atRiskCount})
              </Link>

              {/* CSV export */}
              
              <a  href={csvUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-semibold text-gray-700 bg-gray-100
                  hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </a>
            </div>
          </div>

          {/* Table body */}
          {displayed.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {showAtRisk
                  ? "No at-risk students this month"
                  : "No students in this section"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {showAtRisk
                  ? "All students have attendance ≥ 75% this month."
                  : "Assign students to this section first."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "#",
                      "Student",
                      "Roll No.",
                      "Present",
                      "Absent",
                      "Late",
                      "Half Day",
                      "Total",
                      "Attendance",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-xs font-semibold
                          text-gray-500 uppercase tracking-wide text-left
                          first:w-8"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {displayed.map((s, i) => {
                    const badge    = pctBadge(s.percentage);
                    const isAtRisk = s.total > 0 && s.percentage < 75;
                    const noRecord = s.total === 0;
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isAtRisk
                            ? "bg-red-50/25"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        {/* Index */}
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {i + 1}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-green-100 text-green-700
                              text-xs font-bold rounded-full flex items-center
                              justify-center shrink-0">
                              {s.name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900
                              truncate max-w-[140px]">
                              {s.name}
                            </span>
                          </div>
                        </td>

                        {/* Roll No. */}
                        <td className="px-4 py-3.5 font-mono text-xs
                          text-gray-500">
                          {s.rollNumber ?? (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Present */}
                        <td className="px-4 py-3.5 text-center font-semibold
                          text-emerald-700 tabular-nums">
                          {s.present}
                        </td>

                        {/* Absent */}
                        <td className="px-4 py-3.5 text-center font-semibold
                          text-red-600 tabular-nums">
                          {s.absent}
                        </td>

                        {/* Late */}
                        <td className="px-4 py-3.5 text-center font-semibold
                          text-amber-600 tabular-nums">
                          {s.late}
                        </td>

                        {/* Half Day */}
                        <td className="px-4 py-3.5 text-center font-semibold
                          text-blue-600 tabular-nums">
                          {s.halfDay}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3.5 text-center font-semibold
                          text-gray-700 tabular-nums">
                          {s.total}
                        </td>

                        {/* Percentage badge */}
                        <td className="px-4 py-3.5">
                          {noRecord ? (
                            <span className="text-xs text-gray-300">
                              No records
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-1 text-xs font-bold
                                rounded-full border ${badge}`}
                            >
                              {s.percentage}%
                            </span>
                          )}
                        </td>

                        {/* Status label */}
                        <td className="px-4 py-3.5">
                          {noRecord ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : isAtRisk ? (
                            <span className="inline-flex items-center gap-1
                              text-xs font-semibold text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              At Risk
                            </span>
                          ) : (
                            <span className="text-xs font-semibold
                              text-emerald-700">
                              ✓ Good
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}