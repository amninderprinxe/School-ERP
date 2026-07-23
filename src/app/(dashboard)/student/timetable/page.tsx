import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  TimetableView,
  type TimetablePeriod,
  type TimetableSubject,
} from "@/components/timetable/timetable-view";
import type { DayOfWeekType } from "@/lib/validations/timetable";
import {
  CalendarDays,
  BookOpen,
  Clock,
  Layers,
  FileDown,
} from "lucide-react";
import { PdfDownloadButton } from "@/components/ui/pdf-download-button";

export const metadata = { title: "My Timetable" };

// ── Subject color classes (matches TimetableView palette) ─────────
const LEGEND_COLORS = [
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
];

export default async function StudentTimetablePage() {
  const user = await requireRole(["STUDENT"]);
  const schoolId = user.schoolId!;

  // ── Student profile + section ─────────────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  });

  // ── No section ────────────────────────────────────────────────
  if (!studentProfile?.section) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Timetable
          </h1>

          <p className="mt-0.5 text-sm text-gray-500">
            Your weekly class schedule
          </p>
        </div>

        <div
          className="
            rounded-xl border border-gray-100 bg-white
            py-16 text-center shadow-sm
          "
        >
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-200" />

          <p className="text-sm font-medium text-gray-500">
            Not assigned to a section
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Contact your school admin to be assigned to a class and section.
          </p>
        </div>
      </div>
    );
  }

  const section = studentProfile.section;
  const sectionId = section.id;

  {studentProfile.section && (
  <PdfDownloadButton
    href={`/api/pdf/timetable?sectionId=${studentProfile.section.id}`}
    label="Download Timetable"
  />
)}

  // ── Periods + subjects ────────────────────────────────────────
  const [rawPeriods, rawSubjects] = await Promise.all([
    prisma.period.findMany({
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
    }),

    prisma.subject.findMany({
      where: {
        schoolId,
        classId: section.classId,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  // ── Map to typed props ────────────────────────────────────────
  const periods: TimetablePeriod[] = rawPeriods.map((period) => ({
    id: period.id,
    dayOfWeek: period.dayOfWeek as DayOfWeekType,
    periodNumber: period.periodNumber,
    startTime: period.startTime,
    endTime: period.endTime,
    subjectId: period.subjectId,
    subjectName: period.subject?.name ?? null,
    subjectCode: period.subject?.code ?? null,
    teacherName: period.teacherProfile?.user.name ?? null,
  }));

  const subjects: TimetableSubject[] = rawSubjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
  }));

  const sectionLabel = `${section.class.name} — Section ${section.name}`;

  const filledPeriods = periods.filter(
    (period) => period.subjectId,
  ).length;

  const totalSlots = 8 * 5; // 8 periods × 5 days (Mon–Fri)

  const uniqueTeachers = new Set(
    periods
      .map((period) => period.teacherName)
      .filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Timetable
        </h1>

        <p className="mt-0.5 text-sm text-gray-500">
          {sectionLabel}
        </p>
      </div>

      {/* ── Info strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Class",
            value: section.class.name,
            icon: BookOpen,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Section",
            value: `Section ${section.name}`,
            icon: Layers,
            color: "text-indigo-700",
            bg: "bg-indigo-50",
          },
          {
            label: "Periods Scheduled",
            value: `${filledPeriods} / ${totalSlots}`,
            icon: CalendarDays,
            color: "text-purple-700",
            bg: "bg-purple-50",
          },
          {
            label: "Teachers",
            value: uniqueTeachers,
            icon: Clock,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="
              flex items-start gap-3 rounded-xl border border-gray-100
              bg-white p-4 shadow-sm
            "
          >
            <div
              className={`
                mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center
                rounded-lg ${item.bg}
              `}
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>

            <div>
              <p className={`text-xl font-bold ${item.color}`}>
                {item.value}
              </p>

              <p className="mt-0.5 text-xs font-medium text-gray-400">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Subject legend ─────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject, index) => (
            <span
              key={subject.id}
              className={`
                inline-flex items-center rounded-full px-2.5 py-1
                text-xs font-semibold
                ${LEGEND_COLORS[index % LEGEND_COLORS.length]}
              `}
            >
              {subject.name}
            </span>
          ))}
        </div>
      )}

      {/* ── PDF download button ────────────────────────────── */}
      {filledPeriods > 0 && (
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

      {/* ── Timetable ──────────────────────────────────────── */}
      {filledPeriods === 0 ? (
        <div
          className="
            rounded-xl border border-gray-100 bg-white
            py-16 text-center shadow-sm
          "
        >
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-200" />

          <p className="text-sm font-medium text-gray-500">
            Timetable not set up yet
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Your school admin hasn&apos;t scheduled classes for your
            section yet. Check back soon.
          </p>
        </div>
      ) : (
        <TimetableView
          periods={periods}
          subjects={subjects}
          sectionLabel={sectionLabel}
        />
      )}
    </div>
  );
}

