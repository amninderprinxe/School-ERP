import { Suspense }            from "react";
import { requireRole }         from "@/lib/session";
import { prisma }              from "@/lib/db";
import { AttendanceStats } from "../../../../components/attendance/attendance-stats";
import { AttendanceTable } from "../../../../components/attendance/attendance-table";
import { MonthFilter }         from "@/components/attendance/month-filter";
import {
  calcSummary,
  getCurrentMonth,
  isValidMonth,
  getMonthRange,
}   from "../../../../lib/attendance-utils";

export const metadata = { title: "My Attendance" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function StudentAttendancePage({ searchParams }: Props) {
  const user      = await requireRole(["STUDENT"]);
  const schoolId  = user.schoolId!;
  const sp        = await searchParams;

  const month     = isValidMonth(sp.month) ? sp.month : getCurrentMonth();
  const { gte, lte } = getMonthRange(month);

  // ── Student profile + section info ───────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      section: { include: { class: true } },
    },
  });

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">
            Student profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin.
          </p>
        </div>
      </div>
    );
  }

  // ── Attendance records for selected month ─────────────────────
  const records = await prisma.attendance.findMany({
    where: {
      studentProfileId: studentProfile.id,
      schoolId,
      date: { gte, lte },
    },
    select: {
      id:      true,
      date:    true,
      status:  true,
      remarks: true,
    },
    orderBy: { date: "desc" },
  });

  const summary = calcSummary(records);

  const sectionLabel =
    studentProfile.section
      ? `${studentProfile.section.class.name} — Section ${studentProfile.section.name}`
      : "No section assigned";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
        </div>

        {/* Month filter — wrapped in Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="h-10 w-52 bg-gray-100 rounded-xl animate-pulse" />
          }
        >
          <MonthFilter currentMonth={month} />
        </Suspense>
      </div>

      {/* ── Summary stats ──────────────────────────────────── */}
      <AttendanceStats summary={summary} />

      {/* ── Records table ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center
          justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Attendance Records
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {records.length} record{records.length !== 1 ? "s" : ""} this month
            </p>
          </div>

          {/* Inline month reminder */}
          <span className="text-xs text-gray-400 hidden sm:block">
            Showing: <span className="font-semibold text-gray-600">{month}</span>
          </span>
        </div>

        <AttendanceTable
          records={records.map((r) => ({ ...r, date: new Date(r.date) }))}
          emptyText="No attendance has been marked for you this month."
        />
      </div>

    </div>
  );
}
