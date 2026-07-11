import { Suspense }    from "react";
import { requireRole } from "@/lib/session";
import { prisma }      from "@/lib/db";
import Link            from "next/link";
import { MonthFilter } from "@/components/attendance/month-filter";
import {
  getCurrentMonth,
  isValidMonth,
  getMonthRange,
  formatMonth,
}                      from "@/lib/attendance-utils";
import {
  ArrowLeft,
  CalendarCheck,
  Download,
  ChevronDown,
}                      from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

export const metadata = { title: "Attendance Report" };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "",         label: "All Statuses" },
  { value: "PRESENT",  label: "Present"      },
  { value: "ABSENT",   label: "Absent"       },
  { value: "LATE",     label: "Late"         },
  { value: "HALF_DAY", label: "Half Day"     },
];

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT:  "bg-emerald-50 text-emerald-700",
  ABSENT:   "bg-red-50 text-red-600",
  LATE:     "bg-amber-50 text-amber-700",
  HALF_DAY: "bg-blue-50 text-blue-700",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  LATE:     "Late",
  HALF_DAY: "Half Day",
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day:      "numeric",
    month:    "short",
    year:     "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatDay(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday:  "short",
    timeZone: "Asia/Kolkata",
  });
}

interface Props {
  searchParams: Promise<{
    sectionId?: string;
    month?:     string;
    status?:    string;
  }>;
}

export default async function AttendanceReportPage({ searchParams }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;

  const month     = isValidMonth(sp.month) ? sp.month : getCurrentMonth();
  const { gte, lte } = getMonthRange(month);
  const sectionId = sp.sectionId ?? "";
  const statusFilter = STATUS_OPTIONS.map((o) => o.value).includes(
    sp.status ?? "",
  )
    ? sp.status ?? ""
    : "";

  // ── Sections ─────────────────────────────────────────────────
  const sections = await prisma.section.findMany({
    where:   { schoolId },
    include: { class: true },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  const selectedSection = sections.find((s) => s.id === sectionId);

  // ── Attendance records ────────────────────────────────────────
  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte, lte },
      ...(sectionId && { sectionId }),
      ...(statusFilter && {
        status: statusFilter as AttendanceStatus,
      }),
    },
    include: {
      studentProfile: {
        include: {
          user:    { select: { name: true } },
          section: { include: { class: true } },
        },
      },
      markedBy: { select: { name: true } },
    },
    orderBy: [
      { date:           "desc" },
      { studentProfile: { user: { name: "asc" } } },
    ],
    take: 1000,
  });

  // ── Status counts for this filter set ────────────────────────
  const countsByStatus = records.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );

  // ── CSV export URL ────────────────────────────────────────────
  const csvParams = new URLSearchParams({ month });
  if (sectionId)    csvParams.set("sectionId", sectionId);
  if (statusFilter) csvParams.set("status",    statusFilter);
  const csvUrl = `/api/attendance/export?${csvParams.toString()}`;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/school-admin/attendance?sectionId=${sectionId}&month=${month}`}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatMonth(month)}
            {selectedSection
              ? ` · ${selectedSection.class.name} — Section ${selectedSection.name}`
              : " · All Sections"}
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* GET form for section + status */}
          <form method="GET" className="flex flex-wrap gap-3 flex-1">
            <input type="hidden" name="month" value={month} />

            {/* Section */}
            <div className="relative flex-1 min-w-36">
              <select
                name="sectionId"
                defaultValue={sectionId}
                className="w-full appearance-none border border-gray-300
                  rounded-lg px-3 py-2.5 pr-9 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status */}
            <div className="relative flex-1 min-w-36">
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full appearance-none border border-gray-300
                  rounded-lg px-3 py-2.5 pr-9 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Apply
            </button>
            
            <a  href="/school-admin/attendance/report"
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200
                text-gray-600 text-sm font-medium rounded-lg
                transition-colors inline-flex items-center"
            >
              Clear
            </a>
          </form>

          {/* Month navigator */}
          <div>
            <Suspense
              fallback={
                <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
              }
            >
              <MonthFilter
                currentMonth={month}
                preserveKeys={["sectionId", "status"]}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── Status breakdown pills ────────────────────────────── */}
      {records.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["PRESENT", "ABSENT", "LATE", "HALF_DAY"] as AttendanceStatus[]).map(
            (st) => {
              const cnt = countsByStatus[st] ?? 0;
              if (cnt === 0) return null;
              return (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-semibold rounded-full
                    ${STATUS_STYLE[st]}`}
                >
                  {STATUS_LABEL[st]}
                  <span className="font-bold">{cnt}</span>
                </span>
              );
            },
          )}
        </div>
      )}

      {/* ── Records table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap
          items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Attendance Log
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {records.length} record{records.length !== 1 ? "s" : ""}
              {records.length >= 1000 && " (showing first 1000 — refine filters)"}
            </p>
          </div>
          
          <a  href={csvUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5
              text-xs font-semibold text-gray-700 bg-gray-100
              hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>

        {records.length === 0 ? (
          <div className="py-14 text-center">
            <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No records found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting the filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "#",
                    "Date",
                    "Day",
                    "Student",
                    "Section",
                    "Status",
                    "Marked By",
                    "Remarks",
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
                {records.map((r, i) => {
                  const sec = r.studentProfile.section;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3.5 text-gray-900 font-medium
                        whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500
                        whitespace-nowrap">
                        {formatDay(r.date)}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900
                        max-w-[160px] truncate">
                        {r.studentProfile.user.name}
                      </td>
                      <td className="px-4 py-3.5">
                        {sec ? (
                          <span className="px-2 py-0.5 text-xs font-medium
                            bg-blue-50 text-blue-700 rounded-full whitespace-nowrap">
                            {sec.class.name}-{sec.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold
                            rounded-full ${STATUS_STYLE[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500
                        max-w-[120px] truncate">
                        {r.markedBy.name}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500
                        max-w-[160px] truncate">
                        {r.remarks ?? (
                          <span className="text-gray-300">—</span>
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
    </div>
  );
}