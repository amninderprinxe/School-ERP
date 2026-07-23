import { requireRole }          from "@/lib/session";
import { prisma }               from "@/lib/db";
import Link                     from "next/link";
import {
  setCurrentYear,
  deleteAcademicYear,
  migrateTimetableToYear,
}                               from "@/action/academic-year.actions";
import { RowActions }           from "@/components/ui/row-actions";
import {
  CalendarDays, Plus, CheckCircle2, ArrowRightCircle,
}                               from "lucide-react";

export const metadata = { title: "Academic Years" };

// ── Set-current client button ─────────────────────────────────────
import { SetCurrentButton }     from "./set-current-button";
import { MigrateButton }        from "./migrate-button";

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AcademicYearsPage() {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId)
    return <p className="p-8 text-red-500">No school assigned.</p>;

  const years = await prisma.academicYear.findMany({
    where:   { schoolId },
    include: {
      _count: {
        select: { exams: true, periods: true, feeStructures: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const currentYear = years.find((y) => y.isCurrent);

  // Count legacy periods (NULL year)
  const legacyPeriodCount = await prisma.period.count({
    where: { schoolId, academicYearId: null },
  });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Academic Years
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your school&apos;s academic years
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {currentYear && (
            <Link
              href={`/school-admin/academic-years/rollover?fromYearId=${currentYear.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
                font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                rounded-lg transition-colors"
            >
              <ArrowRightCircle className="w-4 h-4" />
              New Year Rollover
            </Link>
          )}
          <Link
            href="/school-admin/academic-years/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
              font-semibold text-white bg-blue-600 hover:bg-blue-700
              rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Year
          </Link>
        </div>
      </div>

      {/* ── Current year banner ───────────────────────────── */}
      {currentYear && (
        <div className="flex items-center gap-3 px-5 py-4 bg-green-50
          border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-900">
              Current Year: {currentYear.name}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {formatDate(currentYear.startDate)} —{" "}
              {formatDate(currentYear.endDate)}
            </p>
          </div>
        </div>
      )}

      {/* ── Legacy timetable notice ───────────────────────── */}
      {legacyPeriodCount > 0 && currentYear && (
        <div className="flex flex-wrap items-center justify-between gap-4
          p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {legacyPeriodCount} timetable period
              {legacyPeriodCount !== 1 ? "s" : ""} not yet assigned to any year
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Migrate them to <strong>{currentYear.name}</strong> to enable
              year-based timetable filtering.
            </p>
          </div>
          <MigrateButton
            yearId={currentYear.id}
            yearName={currentYear.name}
          />
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        {years.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No academic years yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first academic year to enable year-based filtering.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Year",
                    "Duration",
                    "Exams",
                    "Periods",
                    "Fee Structures",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide
                        ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {years.map((year) => (
                  <tr
                    key={year.id}
                    className={`transition-colors ${
                      year.isCurrent
                        ? "bg-green-50/30"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    {/* Year name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg
                          flex items-center justify-center shrink-0">
                          <CalendarDays className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-gray-900">
                          {year.name}
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(year.startDate)} — {formatDate(year.endDate)}
                    </td>

                    {/* Counts */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 text-xs font-medium
                        bg-purple-50 text-purple-700 rounded-full">
                        {year._count.exams}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 text-xs font-medium
                        bg-blue-50 text-blue-700 rounded-full">
                        {year._count.periods}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 text-xs font-medium
                        bg-orange-50 text-orange-700 rounded-full">
                        {year._count.feeStructures}
                      </span>
                    </td>

                    {/* Status / Set Current */}
                    <td className="px-5 py-4">
                      {year.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5
                          px-2.5 py-1 text-xs font-bold bg-green-100
                          text-green-800 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Current
                        </span>
                      ) : (
                        <SetCurrentButton
                          yearId={year.id}
                          yearName={year.name}
                        />
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!year.isCurrent && (
                          <Link
                            href={`/school-admin/academic-years/rollover?fromYearId=${year.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5
                              text-xs font-medium text-indigo-600 bg-indigo-50
                              hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Rollover from this year"
                          >
                            <ArrowRightCircle className="w-3 h-3" />
                            Rollover
                          </Link>
                        )}
                        <RowActions
                          editHref="#"       // no edit page — use delete + recreate
                          deleteAction={deleteAcademicYear.bind(null, year.id)}
                          entityLabel={`academic year "${year.name}"`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}