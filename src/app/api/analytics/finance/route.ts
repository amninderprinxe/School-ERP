import { NextResponse }  from "next/server";
import { auth }          from "@/lib/auth";
import { prisma }        from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const role     = session.user.role;
  const schoolId = session.user.schoolId ?? "";
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const now       = new Date();
  const m12ago    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const mStart    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [payments, structures, paymentsByMode] = await Promise.all([
    prisma.feePayment.findMany({
      where:   { schoolId },
      include: {
        feeStructure: {
          include: { feeCategory: { select: { name: true } } },
        },
      },
    }),
    prisma.feeStructure.findMany({
      where: { schoolId },
      select: {
        id: true,
        amount: true,
        academicYear: true,
        feeCategory: { select: { name: true } },
      },
    }),
    prisma.feePayment.groupBy({
      by:    ["paymentMode"],
      where: { schoolId, amountPaid: { gt: 0 } },
      _sum:  { amountPaid: true },
      _count: { _all: true },
    }),
  ]);

  // ── Monthly revenue (last 12 months) ─────────────────────────
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d       = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
    const nextD   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const label   = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

    const monthPays = payments.filter(p => {
      const ref = p.paymentDate ?? p.createdAt;
      return ref >= d && ref < nextD;
    });

    const collected = monthPays.reduce((s, p) => s + p.amountPaid, 0);
    const waived    = monthPays.reduce((s, p) => s + p.waivedAmount, 0);

    return { month: label, collected, waived };
  });

  // ── By category ───────────────────────────────────────────────
  const catMap = new Map<string, { total: number; collected: number; outstanding: number }>();
  for (const p of payments) {
    const cat  = p.feeStructure.feeCategory.name;
    const cur  = catMap.get(cat) ?? { total: 0, collected: 0, outstanding: 0 };
    const outs = Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount);
    catMap.set(cat, {
      total:       cur.total + p.feeStructure.amount,
      collected:   cur.collected + p.amountPaid,
      outstanding: cur.outstanding + outs,
    });
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // ── By status ─────────────────────────────────────────────────
  const statusMap: Record<string, { count: number; amount: number }> = {
    PAID:    { count: 0, amount: 0 },
    PARTIAL: { count: 0, amount: 0 },
    PENDING: { count: 0, amount: 0 },
    WAIVED:  { count: 0, amount: 0 },
  };
  for (const p of payments) {
    const s = statusMap[p.status];
    if (s) {
      s.count++;
      s.amount += p.status === "PENDING" || p.status === "PARTIAL"
        ? Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount)
        : p.amountPaid;
    }
  }
  const byStatus = Object.entries(statusMap).map(([status, v]) => ({ status, ...v }));

  // ── By payment mode ───────────────────────────────────────────
  const MODE_LABELS: Record<string, string> = {
    CASH: "Cash", BANK_TRANSFER: "Bank Transfer",
    CHEQUE: "Cheque", ONLINE: "Online",
  };
  const byMode = paymentsByMode.map(m => ({
    mode:   MODE_LABELS[m.paymentMode] ?? m.paymentMode,
    amount: m._sum.amountPaid ?? 0,
    count:  m._count._all,
  }));

  // ── Summary ───────────────────────────────────────────────────
  const totalCollected   = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = payments.reduce((s, p) =>
    s + Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount), 0);
  const thisMonthCollected = payments
    .filter(p => (p.paymentDate ?? p.createdAt) >= mStart)
    .reduce((s, p) => s + p.amountPaid, 0);

  return NextResponse.json({
    monthly, byCategory, byStatus, byMode,
    summary: {
      totalCollected,
      totalOutstanding,
      thisMonthCollected,
      pendingCount: payments.filter(p => p.status === "PENDING" || p.status === "PARTIAL").length,
    },
  });
}