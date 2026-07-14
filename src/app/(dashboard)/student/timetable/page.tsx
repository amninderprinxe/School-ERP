import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import {
  TimetableView,
  type TimetablePeriod,
  type TimetableSubject,
}                       from "@/components/timetable/timetable-view";
import type { DayOfWeekType } from "@/lib/validations/timetable";
import {
  CalendarDays,
  BookOpen,
  Clock,
  Layers,
}                       from "lucide-react";

export const metadata = { title: "My Timetable" };

// ── Subject color classes (matches TimetableView palette) ─────────
const LEGEND_COLORS = [
  "bg-blue-100   text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100  text-green-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100   text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100   text-teal-800",
  "bg-amber-100  text-amber-800",
  "bg-red-100    text-red-800",
  "bg-cyan-100   text-cyan-800",
];

export default async function StudentTimetablePage() {
  const user     = await requireRole(["STUDENT"]);
  const schoolId = user.schoolId!;

  // ── Student profile + section ─────────────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      section: { include: { class: true } },
    },
  });

  // ── No section ────────────────────────────────────────────────
  if (!studentProfile?.section) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your weekly class schedule
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Not assigned to a section
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to be assigned to a class and section.
          </p>
        </div>
      </div>
    );
  }

  const section   = studentProfile.section;
  const sectionId = section.id;

  // ── Periods + subjects ────────────────────────────────────────
  const [rawPeriods, rawSubjects] = await Promise.all([
    prisma.period.findMany({
      where:   { sectionId, schoolId },
      include: {
        subject:        true,
        teacherProfile: {
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.subject.findMany({
      where:   { schoolId, classId: section.classId },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Map to typed props ────────────────────────────────────────
  const periods: TimetablePeriod[] = rawPeriods.map((p) => ({
    id:           p.id,
    dayOfWeek:    p.dayOfWeek as DayOfWeekType,
    periodNumber: p.periodNumber,
    startTime:    p.startTime,
    endTime:      p.endTime,
    subjectId:    p.subjectId,
    subjectName:  p.subject?.name      ?? null,
    subjectCode:  p.subject?.code      ?? null,
    teacherName:  p.teacherProfile?.user.name ?? null,
  }));

  const subjects: TimetableSubject[] = rawSubjects.map((s) => ({
    id:   s.id,
    name: s.name,
  }));

  const sectionLabel =
    `${section.class.name} — Section ${section.name}`;

  const filledPeriods   = periods.filter((p) => p.subjectId).length;
  const totalSlots      = 8 * 5;   // 8 periods × 5 days (Mon–Fri)
  const uniqueTeachers  = new Set(
    periods.map((p) => p.teacherName).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
      </div>

      {/* ── Info strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Class",
            value: section.class.name,
            icon:  BookOpen,
            color: "text-blue-700",
            bg:    "bg-blue-50",
          },
          {
            label: "Section",
            value: `Section ${section.name}`,
            icon:  Layers,
            color: "text-indigo-700",
            bg:    "bg-indigo-50",
          },
          {
            label: "Periods Scheduled",
            value: `${filledPeriods} / ${totalSlots}`,
            icon:  CalendarDays,
            color: "text-purple-700",
            bg:    "bg-purple-50",
          },
          {
            label: "Teachers",
            value: uniqueTeachers,
            icon:  Clock,
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

      {/* ── Subject legend ────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s, i) => (
            <span
              key={s.id}
              className={`inline-flex items-center px-2.5 py-1 text-xs
                font-semibold rounded-full
                ${LEGEND_COLORS[i % LEGEND_COLORS.length]}`}
            >
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* ── No timetable yet ─────────────────────────────────── */}
      {filledPeriods === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Timetable not set up yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Your school admin hasn&apos;t scheduled classes for your section
            yet. Check back soon.
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