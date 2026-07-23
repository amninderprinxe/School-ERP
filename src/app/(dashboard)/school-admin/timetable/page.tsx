import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  TimetableGrid,
  type PeriodData,
  type SubjectOption,
  type TeacherOption,
} from "@/components/school-admin/timetable-grid";
import type { DayOfWeekType } from "@/lib/validations/timetable";
import {
  Layers,
  CalendarDays,
  FileDown,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Timetable" };

interface Props {
  searchParams: Promise<{ sectionId?: string }>;
}

export default async function TimetablePage({ searchParams }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const sp = await searchParams;
  const sectionId = sp.sectionId ?? "";

  const [sections, currentYear] = await Promise.all([
    prisma.section.findMany({
      where: { schoolId },
      include: { class: true },
      orderBy: [
        { class: { name: "asc" } },
        { name: "asc" },
      ],
    }),

    prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const selectedSection = sections.find(
    (section) => section.id === sectionId,
  );

  let subjects: SubjectOption[] = [];
  let teachers: TeacherOption[] = [];
  let periods: PeriodData[] = [];

  if (selectedSection) {
    [subjects, teachers, periods] = await Promise.all([
      prisma.subject.findMany({
        where: {
          schoolId,
          classId: selectedSection.classId,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.teacherProfile
        .findMany({
          where: {
            user: {
              schoolId,
              isActive: true,
            },
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        })
        .then((teacherProfiles) =>
          teacherProfiles.map((teacherProfile) => ({
            id: teacherProfile.id,
            name: teacherProfile.user.name,
            employeeCode: teacherProfile.employeeCode,
          })),
        ),

      // Load periods for current year or legacy NULL-year periods
      prisma.period
        .findMany({
          where: {
            sectionId,
            schoolId,
            OR: currentYear
              ? [
                  {
                    academicYearId: currentYear.id,
                  },
                  {
                    academicYearId: null,
                  },
                ]
              : [
                  {
                    academicYearId: null,
                  },
                ],
          },
          include: {
            subject: true,
            teacherProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
        .then((rawPeriods) => {
          /*
           * Deduplicate periods by timetable slot.
           * Prefer the current academic-year record over a legacy NULL-year
           * record when both exist for the same day and period number.
           */
          const periodMap = new Map<
            string,
            (typeof rawPeriods)[number]
          >();

          for (const period of rawPeriods) {
            const slotKey =
              `${period.dayOfWeek}-${period.periodNumber}`;

            const existingPeriod = periodMap.get(slotKey);

            if (
              !existingPeriod ||
              (
                period.academicYearId &&
                !existingPeriod.academicYearId
              )
            ) {
              periodMap.set(slotKey, period);
            }
          }

          return Array.from(periodMap.values()).map((period) => ({
            id: period.id,
            dayOfWeek: period.dayOfWeek as DayOfWeekType,
            periodNumber: period.periodNumber,
            startTime: period.startTime,
            endTime: period.endTime,
            subjectId: period.subjectId,
            subjectName: period.subject?.name ?? null,
            subjectCode: period.subject?.code ?? null,
            teacherProfileId: period.teacherProfileId,
            teacherName:
              period.teacherProfile?.user.name ?? null,
          }));
        }),
    ]);
  }

  const sectionLabel = selectedSection
    ? `${selectedSection.class.name} — Section ${selectedSection.name}`
    : "";

  const hasScheduledPeriods = periods.some(
    (period) => period.subjectId !== null,
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Timetable
          </h1>

          <p className="mt-0.5 text-sm text-gray-500">
            {currentYear
              ? `Academic Year: ${currentYear.name}`
              : "No academic year set — showing legacy timetable"}
          </p>
        </div>

        {!currentYear && (
          <Link
            href="/school-admin/academic-years/new"
            className="
              inline-flex items-center gap-2 rounded-lg
              bg-indigo-600 px-4 py-2.5 text-sm font-semibold
              text-white transition-colors hover:bg-indigo-700
            "
          >
            <CalendarDays className="h-4 w-4" />
            Set Academic Year
          </Link>
        )}
      </div>

      {/* ── Section selector ───────────────────────────────── */}
      <form
        method="GET"
        className="
          rounded-xl border border-gray-100
          bg-white p-4 shadow-sm
        "
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label
              className="
                mb-1.5 block text-xs font-semibold uppercase
                tracking-wide text-gray-500
              "
            >
              Select Section
            </label>

            <select
              name="sectionId"
              defaultValue={sectionId}
              className="
                w-full rounded-lg border border-gray-300
                bg-white px-3 py-2.5 text-sm
                focus:border-transparent focus:outline-none
                focus:ring-2 focus:ring-blue-500
              "
            >
              <option value="">
                — Select a section —
              </option>

              {sections.map((section) => (
                <option
                  key={section.id}
                  value={section.id}
                >
                  {section.class.name} — Section {section.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="
              rounded-lg bg-blue-600 px-5 py-2.5
              text-sm font-semibold text-white
              transition-colors hover:bg-blue-700
            "
          >
            Load Timetable
          </button>

          {sectionId && (
            <Link
              href="/school-admin/timetable"
              className="
                rounded-lg bg-gray-100 px-5 py-2.5
                text-sm font-medium text-gray-600
                transition-colors hover:bg-gray-200
              "
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* ── No section selected ────────────────────────────── */}
      {!selectedSection && (
        <div
          className="
            rounded-xl border border-gray-100
            bg-white py-16 text-center shadow-sm
          "
        >
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-200" />

          <p className="text-sm font-medium text-gray-500">
            No section selected
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Select a section above to view and manage its timetable.
          </p>
        </div>
      )}

      {/* ── Legend, PDF button and timetable grid ──────────── */}
      {selectedSection && (
        <>
          {subjects.length === 0 && (
            <div
              className="
                rounded-xl border border-amber-200
                bg-amber-50 p-4
              "
            >
              <p className="text-sm text-amber-700">
                No subjects found for{" "}
                {selectedSection.class.name}.
              </p>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject, index) => {
                const color = [
                  "bg-blue-100 text-blue-800",
                  "bg-purple-100 text-purple-800",
                  "bg-green-100 text-green-800",
                  "bg-orange-100 text-orange-800",
                  "bg-pink-100 text-pink-800",
                  "bg-indigo-100 text-indigo-800",
                  "bg-teal-100 text-teal-800",
                  "bg-amber-100 text-amber-800",
                  "bg-red-100 text-red-800",
                  "bg-cyan-100 text-cyan-800",
                ][index % 10];

                return (
                  <span
                    key={subject.id}
                    className={`
                      inline-flex items-center gap-1.5
                      rounded-full px-2.5 py-1
                      text-xs font-semibold ${color}
                    `}
                  >
                    {subject.name}

                    {subject.code && (
                      <span className="font-mono text-[10px] opacity-70">
                        {subject.code}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* ── PDF download button ────────────────────────── */}
          {hasScheduledPeriods && (
            <div className="flex justify-end">
              <a
                href={`/api/pdf/timetable?sectionId=${sectionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-2 rounded-lg
                  border border-indigo-200 bg-indigo-50
                  px-4 py-2 text-sm font-semibold text-indigo-700
                  transition-colors hover:bg-indigo-100
                "
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          )}

          <TimetableGrid
            key={`${sectionId}-${currentYear?.id ?? "none"}`}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            periods={periods}
            subjects={subjects}
            teachers={teachers}
            currentYearName={currentYear?.name ?? null}
          />
        </>
      )}
    </div>
  );
}
