import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import Link              from "next/link";
import { StatCard }      from "@/components/dashboard/stat-card";
import { fmtCurrency }  from "@/lib/fee-utils";
import { calcOutstanding } from "@/lib/fee-utils";
import {
  CalendarCheck, ClipboardList, Wallet,
  Award, TrendingUp, AlertCircle,
  CheckCircle2, BookMarked,
}                        from "lucide-react";

export const metadata = { title: "Student Dashboard" };

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

const EXAM_TYPE_LABELS: Record<string, string> = {
  UNIT_TEST: "Unit Test", MID_TERM: "Mid Term", FINAL: "Final",
  ASSIGNMENT: "Assignment", PRACTICAL: "Practical", OTHER: "Other",
};

export default async function StudentDashboard() {
  const user     = await requireRole(["STUDENT"]);
  const schoolId = user.schoolId!;
  const today    = todayUTC();
  const now      = new Date();

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const in30Days   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Student profile ───────────────────────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      section: { include: { class: { select: { id: true, name: true } } } },
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
            Contact your school admin to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  const classId = studentProfile.section?.class.id;

  const [
    monthAttendance,
    upcomingExams,
    feePayments,
    recentResults,
    mySubjectCount,
  ] = await Promise.all([

    // This month's attendance
    prisma.attendance.groupBy({
      by:    ["status"],
      where: {
        studentProfileId: studentProfile.id,
        date:             { gte: monthStart, lte: today },
      },
      _count: { _all: true },
    }),

    // Upcoming exams for my class
    classId
      ? prisma.exam.findMany({
          where: {
            classId,
            schoolId,
            startDate: { gte: now, lte: in30Days },
          },
          orderBy: { startDate: "asc" },
          take:    5,
        })
      : Promise.resolve([]),

    // Fee payments with structure
    prisma.feePayment.findMany({
      where:   { studentProfileId: studentProfile.id },
      include: { feeStructure: { select: { amount: true, academicYear: true } } },
    }),

    // Recent results
    prisma.result.findMany({
      where:   { studentProfileId: studentProfile.id, schoolId },
      include: {
        exam:    { select: { name: true, examType: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    5,
    }),

    // My subjects count
    classId
      ? prisma.subject.count({ where: { classId, schoolId } })
      : Promise.resolve(0),
  ]);

  // ── Derived ──────────────────────────────────────────────────
  const presentCount = monthAttendance.find((a) => a.status === "PRESENT")?._count._all ?? 0;
  const absentCount  = monthAttendance.find((a) => a.status === "ABSENT")?._count._all  ?? 0;
  const totalMarked  = monthAttendance.reduce((s, a) => s + a._count._all, 0);
  const attendancePct = totalMarked > 0
    ? Math.round((presentCount / totalMarked) * 100)
    : null;

  const totalOutstanding = feePayments.reduce((sum, p) => {
    return sum + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount);
  }, 0);

  const pendingCount = feePayments.filter(
    (p) => p.status === "PENDING" || p.status === "PARTIAL",
  ).length;

  const attendanceColor = attendancePct === null
    ? "gray"
    : attendancePct >= 85 ? "emerald"
    : attendancePct >= 75 ? "amber"
    : "red";

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greet(user.name ?? "User")}
        </h1> 
        <p className="text-sm text-gray-500 mt-0.5">
          {studentProfile.section
            ? `${studentProfile.section.class.name} — Section ${studentProfile.section.name}`
            : "No section assigned"}
          {studentProfile.rollNumber && (
            <span className="ml-2 font-mono text-gray-400">
              · Roll {studentProfile.rollNumber}
            </span>
          )}
        </p>
      </div>

      {/* ── Attendance warning ───────────────────────────────── */}
      {attendancePct !== null && attendancePct < 75 && (
        <div className="flex items-start gap-3 px-5 py-4 bg-red-50
          border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">
              Attendance Below 75%
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Your attendance this month is {attendancePct}%. Minimum required
              is 75%. Please attend classes regularly.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance (Month)"
          value={attendancePct !== null ? `${attendancePct}%` : "—"}
          description={
            totalMarked > 0
              ? `${presentCount} present · ${absentCount} absent`
              : "No records this month"
          }
          icon={CalendarCheck}
          href="/student/attendance"
          color={attendanceColor}
          badge={
            attendancePct !== null
              ? {
                  label: attendancePct >= 75 ? "Good standing" : "Below 75%",
                  color: attendancePct >= 75 ? "green" : "red",
                }
              : undefined
          }
        />
        <StatCard
          title="My Subjects"
          value={mySubjectCount}
          description={
            studentProfile.section
              ? `In ${studentProfile.section.class.name}`
              : "No class assigned"
          }
          icon={BookMarked}
          href="/student/subjects"
          color="purple"
        />
        <StatCard
          title="Upcoming Exams"
          value={upcomingExams.length}
          description="Next 30 days"
          icon={ClipboardList}
          href="/student/results"
          color={upcomingExams.length > 0 ? "amber" : "gray"}
        />
        <StatCard
          title="Fee Outstanding"
          value={totalOutstanding > 0 ? fmtCurrency(totalOutstanding) : "Nil"}
          description={
            pendingCount > 0
              ? `${pendingCount} payment${pendingCount !== 1 ? "s" : ""} pending`
              : "All fees paid"
          }
          icon={Wallet}
          href="/student/fees"
          color={totalOutstanding > 0 ? "red" : "emerald"}
          badge={
            totalOutstanding === 0
              ? { label: "Fully paid", color: "green" }
              : undefined
          }
        />
      </div>

      {/* ── Two column ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming exams */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-gray-900">Upcoming Exams</p>
            </div>
            <Link
              href="/student/results"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Results →
            </Link>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No exams in the next 30 days</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcomingExams.map((exam) => (
                <li key={exam.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center
                    justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {exam.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {EXAM_TYPE_LABELS[exam.examType] ?? exam.examType}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-amber-700">
                      {exam.startDate
                        ? new Date(exam.startDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short",
                          })
                        : "TBD"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent results */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-bold text-gray-900">Recent Results</p>
            </div>
            <Link
              href="/student/results"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Award className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No results yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentResults.map((r) => {
                const pct = Math.round((r.marksObtained / r.maxMarks) * 100);
                return (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center
                      justify-center shrink-0 font-black text-sm
                      ${pct >= 80 ? "bg-green-100 text-green-700"
                        : pct >= 60 ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"}`}>
                      {r.grade ?? `${pct}%`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.subject.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {r.exam.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {r.marksObtained}/{r.maxMarks}
                      </p>
                      <p className="text-xs text-gray-400">{pct}%</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "My Timetable",   href: "/student/timetable",  icon: CalendarCheck, color: "text-indigo-600 bg-indigo-50" },
          { label: "Attendance",     href: "/student/attendance", icon: TrendingUp,     color: "text-emerald-600 bg-emerald-50" },
          { label: "Fee Receipt",    href: "/student/fees",       icon: Wallet,         color: "text-amber-600 bg-amber-50" },
          { label: "Report Card",    href: "/student/results",    icon: Award,          color: "text-blue-600 bg-blue-50" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 bg-white border
              border-gray-100 rounded-xl shadow-sm hover:shadow-md
              hover:border-gray-200 transition-all duration-200 group"
          >
            <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center
              justify-center shrink-0`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

    </div>
  );
}