import { requireRole }           from "@/lib/session";
import { prisma }                from "@/lib/db";
import { SchoolAdminDashboard }  from "@/components/school-admin/dashboard/school-admin-dashboard";
import type { DashboardData }    from "@/components/school-admin/dashboard/school-admin-dashboard";
import type { AttTrendPoint, RevPoint, AdmPoint, ClassDistPoint }
  from "@/components/school-admin/dashboard/dashboard-charts";

export const metadata = { title: "Dashboard — School Admin" };

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────

function utcDay(offsetDays = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  if (offsetDays) d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

function monthStart(offsetMonths = 0): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + offsetMonths, 1));
}

function monthLabel(offsetMonths = 0): string {
  const d = new Date();
  const t = new Date(d.getUTCFullYear(), d.getUTCMonth() + offsetMonths, 1);
  return t.toLocaleDateString("en-IN", { month: "short" }) +
    " " + String(t.getFullYear()).slice(2);
}

// ─────────────────────────────────────────────────────────────────
// AGGREGATION HELPERS
// ─────────────────────────────────────────────────────────────────

function creationsByMonth(
  records:    { createdAt: Date }[],
  months:     number,
): number[] {
  const now    = new Date();
  const result = new Array(months).fill(0);
  for (const r of records) {
    const ma =
      (now.getFullYear()  - r.createdAt.getFullYear()) * 12 +
      (now.getMonth()     - r.createdAt.getMonth());
    if (ma >= 0 && ma < months) result[months - 1 - ma]++;
  }
  return result;
}

function paymentsByMonth(
  payments: { paymentDate: Date | null; amountPaid: number }[],
  months:   number,
): number[] {
  const now    = new Date();
  const result = new Array(months).fill(0);
  for (const p of payments) {
    const ref = p.paymentDate ?? null;
    if (!ref) continue;
    const ma =
      (now.getFullYear() - ref.getFullYear()) * 12 +
      (now.getMonth()    - ref.getMonth());
    if (ma >= 0 && ma < months) result[months - 1 - ma] += p.amountPaid;
  }
  return result;
}

function changePct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

// ─────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────

export default async function SchoolAdminPage() {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId;
  if (!schoolId) {
    return (
      <p className="p-8 text-red-500 text-sm font-medium">
        No school assigned to your account.
      </p>
    );
  }

  const now           = new Date();
  const todayUTC      = utcDay();
  const mStart        = monthStart(0);       // this month
  const mStartLast    = monthStart(-1);      // last month
  const sevenDaysAgo  = utcDay(-6);
  const thirtyDaysAgo = utcDay(-29);
  const sevenMonthsAgo = monthStart(-6);

  // ── Run all queries in parallel ───────────────────────────────
  const [
    // Counts (current)
    studentCount,
    teacherCount,
    parentCount,

    // Counts (at last-month start — for comparison)
    studentLastMonthTotal,
    teacherLastMonthTotal,
    parentLastMonthTotal,

    // Sparkline source data
    recentUsers,     // users created in last 7 months
    recentPayments,  // payments in last 7 months

    // Attendance
    attendanceToday,
    attendance7Days,
    attendance30Days,

    // Fees
    pendingFeeNow,
    pendingFeeLastMonth,

    // Admissions comparison
    admissionsThisMonth,
    admissionsLastMonth,

    // Active sections
    activeSectionsNow,
    activeSectionsLastMonth,

    // Class distribution
    classDist,

    // Meta
    currentYear,
    holidayToday,
    schoolData,
  ] = await Promise.all([

    // ── Counts current ─────────────────────────────────────────
    prisma.user.count({ where: { schoolId, role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER", isActive: true } }),
    prisma.user.count({ where: { schoolId, role: "PARENT",  isActive: true } }),

    // ── Counts last month start (for comparison) ───────────────
    prisma.user.count({ where: { schoolId, role: "STUDENT", isActive: true, createdAt: { lt: mStart } } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER", isActive: true, createdAt: { lt: mStart } } }),
    prisma.user.count({ where: { schoolId, role: "PARENT",  isActive: true, createdAt: { lt: mStart } } }),

    // ── Recent user creations for sparklines ───────────────────
    prisma.user.findMany({
      where:  { schoolId, role: { in: ["STUDENT","TEACHER","PARENT"] }, createdAt: { gte: sevenMonthsAgo } },
      select: { createdAt: true, role: true },
    }),

    // ── Recent payments for revenue sparklines ─────────────────
    prisma.feePayment.findMany({
      where: {
        schoolId,
        amountPaid:  { gt: 0 },
        paymentDate: { gte: sevenMonthsAgo },
      },
      select: { amountPaid: true, paymentDate: true, createdAt: true, status: true },
    }),

    // ── Attendance today (grouped by status) ──────────────────
    prisma.attendance.groupBy({
      by:    ["status"],
      where: { schoolId, date: todayUTC },
      _count: { _all: true },
    }),

    // ── Attendance last 7 days (grouped by date+status) ───────
    prisma.attendance.groupBy({
      by:    ["date", "status"],
      where: { schoolId, date: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),

    // ── Attendance last 30 days (grouped by date+status) ──────
    prisma.attendance.groupBy({
      by:    ["date", "status"],
      where: { schoolId, date: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),

    // ── Pending fees current ───────────────────────────────────
    prisma.feePayment.aggregate({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL"] } },
      _count: { _all: true },
      _sum:   { amountPaid: true },
    }),

    // ── Pending fees last month (count at start of this month) ─
    prisma.feePayment.count({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL"] }, createdAt: { lt: mStart } },
    }),

    // ── New admissions this month ──────────────────────────────
    prisma.user.count({ where: { schoolId, role: "STUDENT", createdAt: { gte: mStart } } }),

    // ── New admissions last month ──────────────────────────────
    prisma.user.count({ where: { schoolId, role: "STUDENT", createdAt: { gte: mStartLast, lt: mStart } } }),

    // ── Active sections now ────────────────────────────────────
    prisma.section.count({
      where: { schoolId, students: { some: { user: { isActive: true } } } },
    }),

    // ── Active sections last month (created before this month) ─
    prisma.section.count({
      where: { schoolId, createdAt: { lt: mStart }, students: { some: {} } },
    }),

    // ── Class distribution ─────────────────────────────────────
    prisma.class.findMany({
      where:   { schoolId },
      include: {
        _count: { select: { sections: true } },
        sections: {
          include: {
            _count: { select: { students: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),

    // ── Current academic year ──────────────────────────────────
    prisma.academicYear.findFirst({
      where:  { schoolId, isCurrent: true },
      select: { name: true },
    }),

    // ── Holiday today ──────────────────────────────────────────
    prisma.holiday.findFirst({
      where:  { schoolId, date: todayUTC },
      select: { name: true, type: true },
    }),

    // ── School name ────────────────────────────────────────────
    prisma.school.findUnique({
      where:  { id: schoolId },
      select: { name: true },
    }),
  ]);

  // ─────────────────────────────────────────────────────────────
  // TRANSFORM DATA
  // ─────────────────────────────────────────────────────────────

  const SPARK_MONTHS = 7;

  // ── Split recent users by role ────────────────────────────────
  const studentCreations = recentUsers.filter((u) => u.role === "STUDENT");
  const teacherCreations = recentUsers.filter((u) => u.role === "TEACHER");
  const parentCreations  = recentUsers.filter((u) => u.role === "PARENT");

  const studentSparkline  = creationsByMonth(studentCreations, SPARK_MONTHS);
  const teacherSparkline  = creationsByMonth(teacherCreations, SPARK_MONTHS);
  const parentSparkline   = creationsByMonth(parentCreations,  SPARK_MONTHS);
  const revenueSparkline  = paymentsByMonth(recentPayments,    SPARK_MONTHS);
  const admissionsSparkline = creationsByMonth(studentCreations, SPARK_MONTHS);

  // ── Revenue this month + last month ──────────────────────────
  const revenueThisMonth = recentPayments
    .filter((p) => p.paymentDate && p.paymentDate >= mStart)
    .reduce((s, p) => s + p.amountPaid, 0);

  const revenueLastMonth = recentPayments
    .filter((p) => p.paymentDate && p.paymentDate >= mStartLast && p.paymentDate < mStart)
    .reduce((s, p) => s + p.amountPaid, 0);

  // ── Attendance — today ────────────────────────────────────────
  const attPresent = attendanceToday.find((a) => a.status === "PRESENT")?._count._all ?? 0;
  const attAbsent  = attendanceToday.find((a) => a.status === "ABSENT" )?._count._all ?? 0;
  const attTotal   = attendanceToday.reduce((s, a) => s + a._count._all, 0);
  const attPct     = attTotal > 0 ? (attPresent / attTotal) * 100 : 0;

  // ── Attendance — 7-day sparkline ──────────────────────────────
  const attSparkline: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().split("T")[0]!;
    const dayRows = attendance7Days.filter(
      (r) => new Date(r.date).toISOString().split("T")[0] === key,
    );
    const p = dayRows.find((r) => r.status === "PRESENT")?._count._all ?? 0;
    const t = dayRows.reduce((s, r) => s + r._count._all, 0);
    attSparkline.push(t > 0 ? Math.round((p / t) * 100) : 0);
  }

  // ── Attendance — last-month average for comparison ────────────
  const attLastMonthRows = attendance7Days.filter((r) => {
    const d = new Date(r.date);
    return d < new Date(mStart);
  });
  const attLastP   = attLastMonthRows.find((r) => r.status === "PRESENT")?._count._all ?? 0;
  const attLastT   = attLastMonthRows.reduce((s, r) => s + r._count._all, 0);
  const attLastPct = attLastT > 0 ? (attLastP / attLastT) * 100 : 0;

  // ── Pending fees sparkline (monthly count of new pending) ─────
  const pendingSparkline = creationsByMonth(
    recentPayments
      .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
      .map((p) => ({ createdAt: new Date(p.createdAt) })),
    SPARK_MONTHS,
  );

  // ── Active sections sparkline (flat) ─────────────────────────
  const classSpark = new Array(SPARK_MONTHS).fill(activeSectionsNow);

  // ─────────────────────────────────────────────────────────────
  // CHART DATA
  // ─────────────────────────────────────────────────────────────

  // ── Attendance trend (30 days) ────────────────────────────────
  const attendanceTrend: AttTrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d      = new Date(now.getTime() - i * 86_400_000);
    const key    = d.toISOString().split("T")[0]!;
    const dayRows = attendance30Days.filter(
      (r) => new Date(r.date).toISOString().split("T")[0] === key,
    );
    const present = dayRows.find((r) => r.status === "PRESENT")?._count._all ?? 0;
    const absent  = dayRows.find((r) => r.status === "ABSENT" )?._count._all ?? 0;
    const total   = dayRows.reduce((s, r) => s + r._count._all, 0);
    attendanceTrend.push({
      date:    d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      pct:     total > 0 ? Math.round((present / total) * 100) : 0,
      present,
      absent,
    });
  }

  // ── Revenue trend (7 months) ──────────────────────────────────
  const revenueTrend: RevPoint[] = Array.from({ length: 7 }, (_, i) => ({
    month:  monthLabel(i - 6),
    amount: revenueSparkline[i] ?? 0,
  }));

  // ── Admissions chart (7 months) ───────────────────────────────
  const admissionsChart: AdmPoint[] = Array.from({ length: 7 }, (_, i) => ({
    month: monthLabel(i - 6),
    count: admissionsSparkline[i] ?? 0,
  }));

  // ── Class distribution ────────────────────────────────────────
  const classDistribution: ClassDistPoint[] = classDist
    .map((cls) => ({
      name:     cls.name,
      students: cls.sections.reduce((s, sec) => s + sec._count.students, 0),
    }))
    .filter((c) => c.students > 0)
    .sort((a, b) => b.students - a.students)
    .slice(0, 8);

  // ─────────────────────────────────────────────────────────────
  // ASSEMBLE
  // ─────────────────────────────────────────────────────────────

  const dashboardData: DashboardData = {
    meta: {
      userName:     user.name ?? null,
      schoolName:   schoolData?.name ?? "",
      currentYear:  currentYear?.name ?? null,
      holidayToday: holidayToday ?? null,
    },
    kpis: {
      students: {
        value:     studentCount,
        lastMonth: studentLastMonthTotal,
        sparkline: studentSparkline,
      },
      teachers: {
        value:     teacherCount,
        lastMonth: teacherLastMonthTotal,
        sparkline: teacherSparkline,
      },
      parents: {
        value:     parentCount,
        lastMonth: parentLastMonthTotal,
        sparkline: parentSparkline,
      },
      attendance: {
        value:     parseFloat(attPct.toFixed(1)),
        lastMonth: parseFloat(attLastPct.toFixed(1)),
        sparkline: attSparkline,
        present:   attPresent,
        absent:    attAbsent,
        total:     attTotal,
      },
      pendingFees: {
        value:     pendingFeeNow._count._all,
        lastMonth: pendingFeeLastMonth,
        sparkline: pendingSparkline,
        amount:    pendingFeeNow._sum.amountPaid ?? 0,
      },
      revenue: {
        value:     revenueThisMonth,
        lastMonth: revenueLastMonth,
        sparkline: revenueSparkline,
      },
      newAdmissions: {
        value:     admissionsThisMonth,
        lastMonth: admissionsLastMonth,
        sparkline: admissionsSparkline,
      },
      activeClasses: {
        value:     activeSectionsNow,
        lastMonth: activeSectionsLastMonth,
        sparkline: classSpark,
      },
    },
    charts: {
      attendanceTrend,
      revenueTrend,
      admissionsChart,
      classDistribution,
    },
  };

  return <SchoolAdminDashboard data={dashboardData} />;
}
