import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import Link              from "next/link";
import { StatCard }      from "@/components/dashboard/stat-card";
import { fmtCurrency }  from "@/lib/fee-utils";
import { calcOutstanding } from "@/lib/fee-utils";
import {
  CalendarCheck, Wallet, CalendarClock,
  Baby, TrendingUp, CheckCircle2,
  ArrowRight, ClipboardList,
}                        from "lucide-react";

export const metadata = { title: "Parent Dashboard" };

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

export default async function ParentDashboard() {
  const user     = await requireRole(["PARENT"]);
  const schoolId = user.schoolId!;
  const today    = todayUTC();
  const now      = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // ── Parent profile + children ─────────────────────────────────
  const parentProfile = await prisma.parentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true } },
              section: { include: { class: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!parentProfile || parentProfile.children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{greet(user.name)}</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <Baby className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No children linked to your account
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to link your children.
          </p>
        </div>
      </div>
    );
  }

  const childIds = parentProfile.children.map((c) => c.studentProfileId);

  // ── Fetch all child data in parallel ─────────────────────────
  const [
    allAttendance,
    allFeePayments,
    upcomingPTM,
    upcomingExams,
  ] = await Promise.all([

    // Month attendance per child
    prisma.attendance.groupBy({
      by:    ["studentProfileId", "status"],
      where: {
        studentProfileId: { in: childIds },
        date: { gte: monthStart, lte: today },
      },
      _count: { _all: true },
    }),

    // Fee payments per child
    prisma.feePayment.findMany({
      where:   { studentProfileId: { in: childIds } },
      include: { feeStructure: { select: { amount: true } } },
    }),

    // Upcoming PTM bookings
    prisma.ptmMeeting.findMany({
      where: {
        parentProfileId: parentProfile.id,
        status:          "SCHEDULED",
        slot:            { date: { gte: today } },
      },
      include: {
        slot: {
          include: {
            teacherProfile: { include: { user: { select: { name: true } } } },
          },
        },
        studentProfile: { include: { user: { select: { name: true } } } },
      },
      orderBy: { slot: { date: "asc" } },
      take:    3,
    }),

    // Upcoming exams for all children's classes
    prisma.exam.findMany({
      where: {
        schoolId,
        startDate: { gte: now, lte: in30Days },
        class: {
          sections: {
            some: { students: { some: { id: { in: childIds } } } },
          },
        },
      },
      include: { class: { select: { name: true } } },
      orderBy: { startDate: "asc" },
      take:    4,
    }),
  ]);

  // ── Build per-child attendance map ───────────────────────────
  type AttMap = Map<string, { present: number; absent: number; total: number }>;
  const attByChild: AttMap = new Map();
  for (const rec of allAttendance) {
    const spId = rec.studentProfileId;
    if (!attByChild.has(spId)) {
      attByChild.set(spId, { present: 0, absent: 0, total: 0 });
    }
    const entry = attByChild.get(spId)!;
    entry.total += rec._count._all;
    if (rec.status === "PRESENT") entry.present += rec._count._all;
    if (rec.status === "ABSENT")  entry.absent  += rec._count._all;
  }

  // ── Build per-child fee map ───────────────────────────────────
  type FeeMap = Map<string, { outstanding: number; pending: number }>;
  const feeByChild: FeeMap = new Map();
  for (const p of allFeePayments) {
    const spId = p.studentProfileId;
    if (!feeByChild.has(spId)) {
      feeByChild.set(spId, { outstanding: 0, pending: 0 });
    }
    const entry = feeByChild.get(spId)!;
    entry.outstanding += calcOutstanding(
      p.feeStructure.amount, p.amountPaid, p.waivedAmount,
    );
    if (p.status === "PENDING" || p.status === "PARTIAL") entry.pending++;
  }

  // ── Overall stats ─────────────────────────────────────────────
  const totalOutstanding = Array.from(feeByChild.values()).reduce(
    (s, f) => s + f.outstanding, 0,
  );

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greet(user.name)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric",
              month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Top stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="My Children"
          value={parentProfile.children.length}
          description="Linked to your account"
          icon={Baby}
          href="/parent/children"
          color="blue"
        />
        <StatCard
          title="Fee Outstanding"
          value={totalOutstanding > 0 ? fmtCurrency(totalOutstanding) : "Nil"}
          description={
            totalOutstanding > 0 ? "Across all children" : "All fees paid ✓"
          }
          icon={Wallet}
          href="/parent/fees"
          color={totalOutstanding > 0 ? "amber" : "emerald"}
        />
        <StatCard
          title="Upcoming PTM"
          value={upcomingPTM.length}
          description={
            upcomingPTM.length > 0
              ? "Scheduled meetings"
              : "No upcoming meetings"
          }
          icon={CalendarClock}
          href="/parent/ptm"
          color={upcomingPTM.length > 0 ? "indigo" : "gray"}
        />
        <StatCard
          title="Upcoming Exams"
          value={upcomingExams.length}
          description="Next 30 days"
          icon={ClipboardList}
          href="/parent/results"
          color={upcomingExams.length > 0 ? "purple" : "gray"}
        />
      </div>

      {/* ── Per-child cards ───────────────────────────────────── */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">
          My Children — This Month
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {parentProfile.children.map(({ studentProfile: sp, relation }) => {
            const att   = attByChild.get(sp.id) ?? { present: 0, absent: 0, total: 0 };
            const fee   = feeByChild.get(sp.id) ?? { outstanding: 0, pending: 0 };
            const pct   = att.total > 0
              ? Math.round((att.present / att.total) * 100)
              : null;

            const INITIAL = sp.user.name[0]?.toUpperCase() ?? "?";

            return (
              <div
                key={sp.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm
                  overflow-hidden"
              >
                {/* Child header */}
                <div className="flex items-center gap-4 px-5 py-4
                  border-b border-gray-100 bg-gray-50/50">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full
                    flex items-center justify-center text-sm font-black shrink-0">
                    {INITIAL}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {sp.user.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sp.section
                        ? `${sp.section.class.name} — Section ${sp.section.name}`
                        : "No section assigned"}
                      {relation && (
                        <span className="ml-1.5 text-gray-300">· {relation}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 divide-x divide-gray-100">

                  {/* Attendance */}
                  <Link
                    href={`/parent/attendance?studentProfileId=${sp.id}`}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarCheck className="w-3.5 h-3.5 text-green-600" />
                      <p className="text-[11px] font-bold text-gray-500 uppercase
                        tracking-wide">
                        Attendance
                      </p>
                    </div>
                    <p className={`text-2xl font-black ${
                      pct === null ? "text-gray-400"
                      : pct >= 85 ? "text-emerald-700"
                      : pct >= 75 ? "text-amber-700"
                      : "text-red-700"
                    }`}>
                      {pct !== null ? `${pct}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {att.total > 0
                        ? `${att.present}P · ${att.absent}A · ${att.total} days`
                        : "No records this month"}
                    </p>
                    {pct !== null && pct < 75 && (
                      <span className="inline-flex items-center gap-1 mt-1
                        text-[10px] font-bold text-red-600 bg-red-50 px-1.5
                        py-0.5 rounded-full">
                        Below 75%
                      </span>
                    )}
                  </Link>

                  {/* Fees */}
                  <Link
                    href="/parent/fees"
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-[11px] font-bold text-gray-500 uppercase
                        tracking-wide">
                        Fees Due
                      </p>
                    </div>
                    <p className={`text-2xl font-black ${
                      fee.outstanding > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {fee.outstanding > 0
                        ? fmtCurrency(fee.outstanding)
                        : "Nil"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fee.outstanding > 0
                        ? `${fee.pending} payment${fee.pending !== 1 ? "s" : ""} pending`
                        : "All paid ✓"}
                    </p>
                  </Link>
                </div>

                {/* Quick links */}
                <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                  {[
                    { label: "Attendance", href: "/parent/attendance" },
                    { label: "Results",    href: "/parent/results"    },
                    { label: "Timetable",  href: "/parent/timetable"  },
                  ].map((lnk) => (
                    <Link
                      key={lnk.href}
                      href={lnk.href}
                      className="flex-1 text-center py-2.5 text-[11px] font-semibold
                        text-gray-500 hover:text-blue-600 hover:bg-blue-50
                        transition-colors"
                    >
                      {lnk.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming PTM ─────────────────────────────────────── */}
      {upcomingPTM.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-bold text-gray-900">Upcoming PTM</p>
            </div>
            <Link
              href="/parent/ptm"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {upcomingPTM.map((meeting) => (
              <li key={meeting.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center bg-indigo-50 rounded-xl
                  px-3 py-2 shrink-0">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase">
                    {new Date(meeting.slot.date).toLocaleDateString("en-IN", {
                      month: "short", timeZone: "Asia/Kolkata",
                    })}
                  </p>
                  <p className="text-xl font-black text-indigo-900">
                    {new Date(meeting.slot.date).toLocaleDateString("en-IN", {
                      day: "numeric", timeZone: "Asia/Kolkata",
                    })}
                  </p>
                  <p className="text-[10px] font-mono text-indigo-500">
                    {meeting.slot.startTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {meeting.slot.teacherProfile.user.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    For: {meeting.studentProfile.user.name}
                  </p>
                </div>
                <Link
                  href="/parent/ptm"
                  className="ml-auto p-2 text-gray-300 hover:text-gray-500
                    rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Upcoming exams ────────────────────────────────────── */}
      {upcomingExams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              <p className="text-sm font-bold text-gray-900">Upcoming Exams</p>
            </div>
            <Link
              href="/parent/results"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Results →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {upcomingExams.map((exam) => (
              <li key={exam.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center
                  justify-center shrink-0">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {exam.name}
                  </p>
                  <p className="text-xs text-gray-400">{exam.class.name}</p>
                </div>
                <p className="text-xs font-semibold text-purple-700 shrink-0">
                  {exam.startDate
                    ? new Date(exam.startDate).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })
                    : "TBD"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
