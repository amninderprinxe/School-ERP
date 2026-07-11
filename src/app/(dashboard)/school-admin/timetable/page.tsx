import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  TimetableGrid,
  type PeriodData,
  type SubjectOption,
  type TeacherOption,
} from "@/components/school-admin/timetable-grid";
import type { DayOfWeekType } from "@/lib/validations/timetable";
import { Layers } from "lucide-react";

export const metadata = { title: "Timetable" };

interface Props {
  searchParams: Promise<{ sectionId?: string }>;
}

export default async function TimetablePage({ searchParams }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId;

  if (!schoolId) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-700">
          School not assigned
        </h1>
        <p className="text-sm text-red-600 mt-1">
          Your School Admin account is not linked with any school.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const sectionId = sp.sectionId ?? "";

  const sections = await prisma.section.findMany({
    where: { schoolId },
    include: { class: true },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  const selectedSection = sections.find((s) => s.id === sectionId);

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
        .then((tps): TeacherOption[] =>
          tps.map((tp) => ({
            id: tp.id,
            name: tp.user.name,
            employeeCode: tp.employeeCode,
          })),
        ),

      prisma.period
        .findMany({
          where: {
            sectionId,
            schoolId,
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
        .then((ps): PeriodData[] =>
          ps.map((p) => ({
            id: p.id,
            dayOfWeek: p.dayOfWeek as DayOfWeekType,
            periodNumber: p.periodNumber,
            startTime: p.startTime,
            endTime: p.endTime,
            subjectId: p.subjectId ?? null,
            subjectName: p.subject?.name ?? null,
            subjectCode: p.subject?.code ?? null,
            teacherProfileId: p.teacherProfileId ?? null,
            teacherName: p.teacherProfile?.user.name ?? null,
          })),
        ),
    ]);
  }

  const sectionLabel = selectedSection
    ? `${selectedSection.class.name} — Section ${selectedSection.name}`
    : "";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Design the weekly schedule for each section
        </p>
      </div>

      {/* Section selector */}
      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Select Section
            </label>

            <select
              name="sectionId"
              defaultValue={sectionId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">— Select a section —</option>

              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Load Timetable
          </button>

          {sectionId && (
            <a
              href="/school-admin/timetable"
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      {/* No section chosen */}
      {!selectedSection && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No section selected
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select a section above to view or edit its weekly timetable.
          </p>
        </div>
      )}

      {/* Legend + Grid */}
      {selectedSection && (
        <>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s, i) => {
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
                ][i % 10];

                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${color}`}
                  >
                    {s.name}

                    {s.code && (
                      <span className="font-mono text-[10px] opacity-70">
                        {s.code}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {subjects.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <span className="font-semibold">No subjects found</span> for{" "}
              {selectedSection.class.name}. Add subjects to this class first,
              then come back to build the timetable.
            </div>
          )}

          <TimetableGrid
            key={sectionId}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            periods={periods}
            subjects={subjects}
            teachers={teachers}
          />
        </>
      )}
    </div>
  );
}