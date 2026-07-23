import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import {
  TimetableView,
  type TimetablePeriod,
  type TimetableSubject,
}                       from "@/components/timetable/timetable-view";
import {
  ChildSelector,
  type ChildOption,
}                       from "@/components/results/child-selector";
import type { DayOfWeekType } from "@/lib/validations/timetable";
import {
  Baby,
  CalendarDays,
  BookOpen,
  Layers,
}                       from "lucide-react";

export const metadata = { title: "Children's Timetable" };

interface Props {
  searchParams: Promise<{ childId?: string }>;
}

// ── Subject legend palette ────────────────────────────────────────
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

export default async function ParentTimetablePage({ searchParams }: Props) {
  const user     = await requireRole(["PARENT"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;

  // ── Parent profile + linked children ─────────────────────────
  const parentProfile = await prisma.parentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true, isActive: true } },
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-500">
          Parent profile not found. Contact your school admin.
        </p>
      </div>
    );
  }

  const linked = parentProfile.children;

  // ── No children ───────────────────────────────────────────────
  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Children&apos;s Timetable
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View your children&apos;s weekly class schedules
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <Baby className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No children linked</p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to link your children to your account.
          </p>
        </div>
      </div>
    );
  }

  // ── Resolve selected child (security: must belong to this parent) ─
  const validIds = new Set(linked.map((c) => c.studentProfileId));

  const selectedId =
    sp.childId && validIds.has(sp.childId)
      ? sp.childId
      : linked[0]!.studentProfileId;

  const selectedLink  = linked.find(
    (c) => c.studentProfileId === selectedId,
  )!;
  const selectedChild = selectedLink.studentProfile;

  // ── Security: child must be in the same school ────────────────
  const childUser = await prisma.user.findUnique({
    where:  { id: selectedChild.userId },
    select: { schoolId: true },
  });
  if (!childUser || childUser.schoolId !== schoolId) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-red-500">Access denied.</p>
      </div>
    );
  }

  // ── Build ChildOption list ────────────────────────────────────
  const childOptions: ChildOption[] = linked.map((c) => ({
    studentProfileId: c.studentProfileId,
    name:             c.studentProfile.user.name,
    relation:         c.relation,
  }));

  const section = selectedChild.section;

  // ── Load periods + subjects for selected child's section ──────
  let periods:  TimetablePeriod[]  = [];
  let subjects: TimetableSubject[] = [];

  if (section) {
    const [rawPeriods, rawSubjects] = await Promise.all([
      prisma.period.findMany({
        where:   { sectionId: section.id, schoolId },
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

    periods = rawPeriods.map((p) => ({
      id:           p.id,
      dayOfWeek:    p.dayOfWeek as DayOfWeekType,
      periodNumber: p.periodNumber,
      startTime:    p.startTime,
      endTime:      p.endTime,
      subjectId:    p.subjectId,
      subjectName:  p.subject?.name            ?? null,
      subjectCode:  p.subject?.code            ?? null,
      teacherName:  p.teacherProfile?.user.name ?? null,
    }));

    subjects = rawSubjects.map((s) => ({
      id:   s.id,
      name: s.name,
    }));
  }

  const sectionLabel = section
    ? `${section.class.name} — Section ${section.name}`
    : "No section assigned";

  const filledPeriods = periods.filter((p) => p.subjectId).length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Children&apos;s Timetable
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View your children&apos;s weekly class schedules
        </p>
      </div>

      {/* ── Child selector (hidden if only 1 child) ───────────── */}
      {linked.length > 1 && (
        <ChildSelector
          children={childOptions}
          selectedId={selectedId}
          basePath="/parent/timetable"
        />
      )}

      {/* ── Selected child info card ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 bg-gradient-to-br from-green-400
            to-teal-500 rounded-full flex items-center justify-center
            text-white text-xl font-bold shrink-0 shadow">
            {selectedChild.user.name[0]?.toUpperCase() ?? "S"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-gray-900 truncate">
                {selectedChild.user.name}
              </p>
              {selectedLink.relation && (
                <span className="px-2 py-0.5 text-xs font-semibold
                  bg-blue-50 text-blue-700 rounded-full">
                  {selectedLink.relation}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
          </div>

          {/* Quick stats */}
          {section && (
            <div className="hidden sm:flex items-center gap-5 shrink-0">
              <div className="text-center">
                <p className="text-xl font-bold text-indigo-700">
                  {section.class.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Class</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-700">
                  {filledPeriods}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Period{filledPeriods !== 1 ? "s" : ""} set
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── No section assigned ───────────────────────────────── */}
      {!section && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-14 text-center">
          <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {selectedChild.user.name} is not assigned to a section
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact the school admin to assign your child to a class section.
          </p>
        </div>
      )}

      {/* ── Section + class info strip ───────────────────────── */}
      {section && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              label: "Scheduled",
              value: `${filledPeriods} period${filledPeriods !== 1 ? "s" : ""}`,
              icon:  CalendarDays,
              color: "text-purple-700",
              bg:    "bg-purple-50",
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
                <p className={`text-base font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-xs font-medium text-gray-400 mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Subject legend ────────────────────────────────────── */}
      {section && subjects.length > 0 && (
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

      {/* ── Timetable grid ────────────────────────────────────── */}
      {section && filledPeriods === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Timetable not set up yet for {selectedChild.user.name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            The school admin hasn&apos;t scheduled classes for this section yet.
          </p>
        </div>
      )}

      {section && filledPeriods > 0 && (
        <TimetableView
          periods={periods}
          subjects={subjects}
          sectionLabel={sectionLabel}
        />
      )}

    </div>
  );
}
