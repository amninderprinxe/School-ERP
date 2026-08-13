import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const role     = session.user.role;
  const schoolId = session.user.schoolId ?? "";
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const now = new Date();
  const y5ago = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));

  const [allStudents, classDist] = await Promise.all([
    prisma.user.findMany({
      where:  { schoolId, role: "STUDENT", createdAt: { gte: y5ago } },
      select: { createdAt: true },
    }),
    prisma.class.findMany({
      where:   { schoolId },
      include: {
        sections: {
          include: { _count: { select: { students: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Monthly (last 12 months) ──────────────────────────────────
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const idx    = 11 - i;
    const d      = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - idx, 1));
    const nextD  = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const count  = allStudents.filter(s => s.createdAt >= d && s.createdAt < nextD).length;
    return {
      month: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      count,
    };
  });

  // Cumulative
  let cumulative = 0;
  const monthlyWithCumulative = monthly.map(m => {
    cumulative += m.count;
    return { ...m, cumulative };
  });

  // ── Yearly comparison (last 5 years) ─────────────────────────
  const yearly = Array.from({ length: 5 }, (_, i) => {
    const year  = now.getUTCFullYear() - (4 - i);
    const start = new Date(Date.UTC(year, 0, 1));
    const end   = new Date(Date.UTC(year + 1, 0, 1));
    const count = allStudents.filter(s => s.createdAt >= start && s.createdAt < end).length;
    return { year: String(year), count };
  });

  // ── By class ──────────────────────────────────────────────────
  const byClass = classDist
    .map(c => ({
      name:     c.name,
      students: c.sections.reduce((s, sec) => s + sec._count.students, 0),
    }))
    .filter(c => c.students > 0)
    .sort((a, b) => b.students - a.students);

  const thisYear  = now.getUTCFullYear();
  const lastYear  = thisYear - 1;
  const thisYearCount = allStudents.filter(s => s.createdAt.getUTCFullYear() === thisYear).length;
  const lastYearCount = allStudents.filter(s => s.createdAt.getUTCFullYear() === lastYear).length;
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonthCount = allStudents.filter(s => s.createdAt >= thisMonthStart).length;

  return NextResponse.json({
    monthly: monthlyWithCumulative,
    yearly,
    byClass,
    summary: {
      total:          allStudents.length,
      thisYear:       thisYearCount,
      lastYear:       lastYearCount,
      thisMonth:      thisMonthCount,
      yoyGrowthPct:   lastYearCount > 0
        ? Math.round(((thisYearCount - lastYearCount) / lastYearCount) * 100)
        : 0,
    },
  });
}