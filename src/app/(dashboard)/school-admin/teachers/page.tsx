import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import Link              from "next/link";
import { StatCard }      from "@/components/dashboard/stat-card";
import type { DayOfWeek } from "@prisma/client";
import {
  CalendarDays, Users, BookMarked, Clock,
  AlertCircle, CheckCircle2, CalendarCheck,
  Layers, ArrowRight,
}                        from "lucide-react";

export const metadata = { title: "Teacher Dashboard" };

function greet(name: string | null): string {
  const h  = new Date().getHours();
  const t  = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const fn = name?.split(" ")[0] ?? null;
  return `Good ${t}${fn ? `, ${fn}` : ""}`;
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function TeacherDashboard() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;
  const today    = todayUTC();

  // Today's day of week
  const DOW_JS: DayOfWeek[] = [
    "SUNDAY" as DayOfWeek,   // index 0
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
  ];
  const VALID_DAYS: DayOfWeek[] = [
    "MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY",
  ];
  const rawDow    = DOW_JS[new Date().getDay()];
  const todayDow  = rawDow && VALID_DAYS.includes(rawDow) ? rawDow : null;

  // ── Teacher profile ───────────────────────────────────────────
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    select:  { id: true, employeeCode: true },
  });

  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
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

  const tp = teacherProfile;

  // ── Current academic year ─────────────────────────────────────
  const currentYear = await prisma.academicYear.findFirst({
    where:  { schoolId, isCurrent: true },
    select: { id: true, name: true },
  });

  // ── Parallel data fetch ───────────────────────────────────────
  const [
    todayPeriods,
    allMySectionIds,
    mySubjectCount,
    markedSectionsToday,
    mySubjects,
  ] = await Promise.all([

    // Today's periods
    todayDow
      ? prisma.period.findMany({
          where: {
            teacherProfileId: tp.id,
            schoolId,
            dayOfWeek: todayDow,
            OR: currentYear
              ? [{ academicYearId: currentYear.id }, { academicYearId: null }]
              : [{ academicYearId: null }],
          },
          include: {
            subject:  { select: { name: true, code: true } },
            section:  { include: { class: { select: { name: true } } } },
          },
          orderBy: { periodNumber: "asc" },
        })
      : Promise.resolve([]),

    // All unique sections (from periods)
    prisma.period.findMany({
      where:    { teacherProfileId: tp.id, schoolId },
      distinct: ["sectionId"],
      select:   { sectionId: true },
    }),

    // Subject count
    prisma.teacherSubject.count({ where: { teacherProfileId: tp.id } }),

    // Sections that already have attendance marked today
    prisma.attendance.findMany({
      where: {
        schoolId,
        date:      today,
        markedById: user.id,
      },
      distinct: ["sectionId"],
      select:   { sectionId: true },
    }),

    // My subjects for display
    prisma.teacherSubject.findMany({
      where:   { teacherProfileId: tp.id },
      include: {
        subject: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
      take: 6,
    }),
  ]);

  const mySectionIds    = allMySectionIds.map((p) => p.sectionId);
  const markedIds       = new Set(markedSectionsToday.map((a) => a.sectionId));

  // Sections I'm responsible for but haven't marked attendance yet
  const unmarkedSections = mySectionIds.filter((id) => !markedIds.has(id));

  // Student count in my sections
  const myStudentCount = await prisma.studentProfile.count({
    where: {
      sectionId: { in: mySectionIds },
      user:      { isActive: true },
    },
  });

  const dayName = todayDow
    ? todayDow.charAt(0) + todayDow.slice(1).toLowerCase()
    : "Sunday";

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greet(user.name)}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric",
              month: "long", year: "numeric",
            })}
            {currentYear && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5
                text-[11px] font-semibold bg-indigo-50 text-indigo-700
                border border-indigo-200 rounded-full">
                📅 {currentYear.name}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Attendance reminder ───────────────────────────────── */}
      {unmarkedSections.length > 0 && todayDow && (
        <div className="flex items-center justify-between gap-4 px-5 py-4
          bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Attendance not marked yet
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {unmarkedSections.length} section
                {unmarkedSections.length !== 1 ? "s" : ""} still need today&apos;s
                attendance.
              </p>
            </div>
          </div>
          <Link
            href="/teacher/attendance"
            className="shrink-0 px-4 py-2 text-xs font-bold text-amber-800
              bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            Mark Now →
          </Link>
        </div>
      )}

      {/* All sections marked */}
      {unmarkedSections.length === 0 && mySectionIds.length > 0 && todayDow && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-green-50
          border border-green-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">
            All attendance marked for today ✓
          </p>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Students"
          value={myStudentCount.toLocaleString("en-IN")}
          description={`Across ${mySectionIds.length} section${mySectionIds.length !== 1 ? "s" : ""}`}
          icon={Users}
          href="/teacher/students"
          color="blue"
        />
        <StatCard
          title="My Sections"
          value={mySectionIds.length}
          description="Classes where you teach"
          icon={Layers}
          href="/teacher/classes"
          color="green"
        />
        <StatCard
          title="My Subjects"
          value={mySubjectCount}
          description="Subjects assigned to you"
          icon={BookMarked}
          href="/teacher/subjects"
          color="purple"
        />
        <StatCard
          title="Periods Today"
          value={todayPeriods.length}
          description={todayDow ? `${dayName}'s teaching schedule` : "No school on Sunday"}
          icon={Clock}
          color={todayPeriods.length === 0 ? "gray" : "indigo"}
        />
      </div>

      {/* ── Today's schedule ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4
          border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-bold text-gray-900">
              Today&apos;s Schedule
              <span className="ml-2 text-xs font-normal text-gray-400">
                {dayName}
              </span>
            </p>
          </div>
          <Link
            href="/teacher/timetable"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Full timetable →
          </Link>
        </div>

        {!todayDow ? (
          <div className="px-5 py-12 text-center">
            <CalendarDays className="w-9 h-9 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              It&apos;s Sunday — no classes today
            </p>
          </div>
        ) : todayPeriods.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarDays className="w-9 h-9 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No periods scheduled for today
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayPeriods.map((period) => {
              const sectionLabel = `${period.section.class.name} — Section ${period.section.name}`;
              const alreadyMarked = markedIds.has(period.sectionId);
              return (
                <div key={period.id} className="flex items-center gap-4 px-5 py-4
                  hover:bg-gray-50/50 transition-colors">

                  {/* Period number */}
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center
                    justify-center shrink-0">
                    <span className="text-sm font-black text-indigo-700">
                      P{period.periodNumber}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {period.subject?.name ?? "Free Period"}
                      {period.subject?.code && (
                        <span className="ml-1.5 text-xs font-mono text-gray-400">
                          ({period.subject.code})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{sectionLabel}</p>
                  </div>

                  {/* Time */}
                  {(period.startTime || period.endTime) && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-semibold text-gray-700">
                        {period.startTime}
                        {period.startTime && period.endTime ? "–" : ""}
                        {period.endTime}
                      </p>
                    </div>
                  )}

                  {/* Attendance status */}
                  {alreadyMarked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1
                      text-[10px] font-bold bg-green-50 text-green-700
                      border border-green-200 rounded-full shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Marked
                    </span>
                  ) : (
                    <Link
                      href={`/teacher/attendance?sectionId=${period.sectionId}&date=${today.toISOString().split("T")[0]}`}
                      className="inline-flex items-center gap-1 px-2 py-1
                        text-[10px] font-bold bg-amber-50 text-amber-700
                        border border-amber-200 rounded-full hover:bg-amber-100
                        transition-colors shrink-0"
                    >
                      <CalendarCheck className="w-2.5 h-2.5" />
                      Mark
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My subjects quick view ────────────────────────────── */}
      {mySubjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-purple-500" />
              <p className="text-sm font-bold text-gray-900">My Subjects</p>
            </div>
            <Link
              href="/teacher/subjects"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 p-5">
            {mySubjects.map((ts) => (
              <span
                key={ts.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-semibold bg-purple-50 text-purple-800
                  border border-purple-100 rounded-full"
              >
                {ts.subject.name}
                <span className="text-purple-500 font-normal">
                  · {ts.subject.class.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
