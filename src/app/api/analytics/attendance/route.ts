import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma }                    from "@/lib/db";

export const dynamic = "force-dynamic";

function utcDay(offset = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

function buildMonthGrid(monthsBack: number) {
  const now = new Date();
  return Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1 - i), 1));
    return {
      key:   `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      year:  d.getUTCFullYear(),
      month: d.getUTCMonth(),
    };
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const role     = session.user.role;
  const schoolId = session.user.schoolId ?? "";
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp      = request.nextUrl.searchParams;
  const days    = parseInt(sp.get("days") ?? "30");
  const since   = utcDay(-(days - 1));
  const today   = utcDay(0);
  const m12ago  = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth() - 11,
    1,
  ));

  const [rawDaily, rawMonthly, todayRows, totalStudents] = await Promise.all([
    prisma.attendance.groupBy({
      by:    ["date", "status"],
      where: { schoolId, date: { gte: since, lte: today } },
      _count: { _all: true },
      orderBy: { date: "asc" },
    }),
    prisma.attendance.findMany({
      where:  { schoolId, date: { gte: m12ago, lte: today } },
      select: { date: true, status: true },
    }),
    prisma.attendance.groupBy({
      by:    ["status"],
      where: { schoolId, date: today },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { schoolId, role: "STUDENT", isActive: true } }),
  ]);

  // ── Daily ────────────────────────────────────────────────────
  const dayMap = new Map<string, Record<string, number>>();
  for (let i = 0; i < days; i++) {
    const d   = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().split("T")[0]!;
    dayMap.set(key, { present: 0, absent: 0, late: 0, halfDay: 0 });
  }
  for (const r of rawDaily) {
    const key = new Date(r.date).toISOString().split("T")[0]!;
    const e   = dayMap.get(key);
    if (!e) continue;
    if (r.status === "PRESENT")  e.present  += r._count._all;
    if (r.status === "ABSENT")   e.absent   += r._count._all;
    if (r.status === "LATE")     e.late     += r._count._all;
    if (r.status === "HALF_DAY") e.halfDay  += r._count._all;
  }
  const daily = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rawDate, v]) => {
      const total = v.present! + v.absent! + v.late! + v.halfDay!;
      const pct   = total > 0 ? Math.round(((v.present! + v.late! * 0.5) / total) * 100) : 0;
      return {
        date:    new Date(rawDate + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        rawDate,
        present: v.present!,
        absent:  v.absent!,
        late:    v.late!,
        halfDay: v.halfDay!,
        total,
        pct,
      };
    });

  // ── Weekly (group daily into 7-day buckets) ───────────────────
  const weekBuckets: Record<number, typeof daily>  = {};
  const nowMs = Date.now();
  for (const d of daily) {
    const diffDays = Math.floor((nowMs - new Date(d.rawDate + "T00:00:00Z").getTime()) / 86_400_000);
    const bucket   = Math.min(11, Math.floor(diffDays / 7));
    if (!weekBuckets[bucket]) weekBuckets[bucket] = [];
    weekBuckets[bucket].push(d);
  }
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const bucketIdx = 11 - i;
    const bucketDay = new Date(nowMs - bucketIdx * 7 * 86_400_000);
    const entries   = weekBuckets[bucketIdx] ?? [];
    const present   = entries.reduce((s, d) => s + d.present, 0);
    const absent    = entries.reduce((s, d) => s + d.absent, 0);
    const total     = entries.reduce((s, d) => s + d.total, 0);
    return {
      week:    bucketDay.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      present, absent, total,
      pct: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  // ── Monthly ───────────────────────────────────────────────────
  const grid    = buildMonthGrid(12);
  const monthly = grid.map(({ label, year, month }) => {
    const recs    = rawMonthly.filter(r => {
      const d = new Date(r.date);
      return d.getUTCFullYear() === year && d.getUTCMonth() === month;
    });
    const present = recs.filter(r => r.status === "PRESENT").length;
    const absent  = recs.filter(r => r.status === "ABSENT").length;
    const late    = recs.filter(r => r.status === "LATE").length;
    const total   = recs.length;
    return {
      month: label, present, absent, late, total,
      pct:   total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  // ── Today summary ─────────────────────────────────────────────
  const tPresent = todayRows.find(r => r.status === "PRESENT")?._count._all ?? 0;
  const tAbsent  = todayRows.find(r => r.status === "ABSENT" )?._count._all ?? 0;
  const tTotal   = todayRows.reduce((s, r) => s + r._count._all, 0);

  return NextResponse.json({
    daily, weekly, monthly,
    summary: {
      totalStudents,
      todayPresent:  tPresent,
      todayAbsent:   tAbsent,
      todayTotal:    tTotal,
      todayPct:      tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : 0,
      avgMonthlyPct: Math.round(
        monthly.reduce((s, m) => s + m.pct, 0) /
        (monthly.filter(m => m.total > 0).length || 1)
      ),
    },
  });
}