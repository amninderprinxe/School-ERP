import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import type { PaymentStatus, PaymentMode } from "@prisma/client";

export const dynamic = "force-dynamic";

function toISO(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function monthStart(offset = 0): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + offset, 1));
}

function monthLabel(offset = 0): string {
  const d = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth() + offset,
    1,
  ));
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

type StudentPaymentDetail = {
  id:             string;
  category:       string;
  amount:         number;
  paid:           number;
  waived:         number;
  outstanding:    number;
  status:         PaymentStatus | string;
  dueDate:        Date | null;
  paymentDate:    Date | null;
  paymentMode:    PaymentMode | string;
  transactionRef: string | null;
};

type StudentMapEntry = {
  studentProfileId: string;
  name:             string;
  email:            string | null;
  avatarUrl:        string | null;
  rollNumber:       string | null;
  sectionLabel:     string;
  classId:          string;
  totalFee:         number;
  collected:        number;
  outstanding:      number;
  waived:           number;
  lastPaymentDate:  Date | null;
  lastPaymentAmt:   number;
  nextDueDate:      Date | null;
  statuses:         (PaymentStatus | string)[];
  payments:         StudentPaymentDetail[];
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const schoolId  = session.user.schoolId ?? "";
  const sp        = request.nextUrl.searchParams;
  const classId   = sp.get("classId")      ?? "";
  const status    = sp.get("status")       ?? "";
  const acYear    = sp.get("academicYear") ?? "";
  const search    = sp.get("search")?.toLowerCase() ?? "";

  const today       = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayEnd    = new Date(today);
  todayEnd.setUTCHours(23, 59, 59, 999);

  // ── Base fee-payment query ─────────────────────────────────────
  const allPayments = await prisma.feePayment.findMany({
    where: {
      schoolId,
      ...(acYear && { feeStructure: { academicYear: acYear } }),
      ...(classId && {
        studentProfile: {
          section: { classId },
        },
      }),
    },
    include: {
      feeStructure: {
        include: { feeCategory: { select: { name: true } } },
      },
      studentProfile: {
        include: {
          user:    { select: { name: true, email: true, avatarUrl: true } },
          section: { include: { class: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── KPIs ──────────────────────────────────────────────────────
  const totalFee    = allPayments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const collected   = allPayments.reduce((s, p) => s + p.amountPaid, 0);
  const waived      = allPayments.reduce((s, p) => s + p.waivedAmount, 0);
  const outstanding = allPayments.reduce((s, p) =>
    s + Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount), 0);
  const overdue     = allPayments
    .filter(p =>
      (p.status === "PENDING" || p.status === "PARTIAL") &&
      p.feeStructure.dueDate &&
      p.feeStructure.dueDate < today,
    )
    .reduce((s, p) =>
      s + Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount), 0);
  const todayCollection = allPayments
    .filter(p =>
      p.paymentDate &&
      p.paymentDate >= today &&
      p.paymentDate <= todayEnd,
    )
    .reduce((s, p) => s + p.amountPaid, 0);
  const todayCount = allPayments.filter(p =>
    p.paymentDate && p.paymentDate >= today && p.paymentDate <= todayEnd,
  ).length;

  // ── Monthly trend (last 12 months) ───────────────────────────
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const offset = i - 11;
    const start  = monthStart(offset);
    const end    = monthStart(offset + 1);
    const label  = monthLabel(offset);
    const pays   = allPayments.filter(p =>
      p.paymentDate && p.paymentDate >= start && p.paymentDate < end,
    );
    const pending = allPayments.filter(p => {
      if (!p.feeStructure.dueDate) return false;
      const dd = p.feeStructure.dueDate;
      return dd >= start && dd < end && (p.status === "PENDING" || p.status === "PARTIAL");
    });
    return {
      month:     label,
      collected: pays.reduce((s, p) => s + p.amountPaid, 0),
      pending:   pending.reduce((s, p) =>
        s + Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount), 0),
    };
  });

  // ── Payment mode distribution ─────────────────────────────────
  const modeMap = new Map<string, number>();
  for (const p of allPayments) {
    if (p.amountPaid === 0) continue;
    const key = p.paymentMode;
    modeMap.set(key, (modeMap.get(key) ?? 0) + p.amountPaid);
  }
  const byMode = Array.from(modeMap.entries()).map(([mode, amount]) => ({ mode, amount }));

  // ── Per-student aggregation ───────────────────────────────────
  const studentMap = new Map<string, StudentMapEntry>();

  for (const p of allPayments) {
    const sp  = p.studentProfile;
    const key = sp.id;
    const cur: StudentMapEntry = studentMap.get(key) ?? {
      studentProfileId: sp.id,
      name:             sp.user.name,
      email:            sp.user.email,
      avatarUrl:        sp.user.avatarUrl,
      rollNumber:       sp.rollNumber,
      sectionLabel:     sp.section
        ? `${sp.section.class.name} — ${sp.section.name}`
        : "Unassigned",
      classId: sp.section?.class.id ?? "",
      totalFee:        0,
      collected:       0,
      outstanding:     0,
      waived:          0,
      lastPaymentDate: null,
      lastPaymentAmt:  0,
      nextDueDate:     null,
      statuses:        [],
      payments:        [],
    };

    const outs = Math.max(0, p.feeStructure.amount - p.amountPaid - p.waivedAmount);
    cur.totalFee    += p.feeStructure.amount;
    cur.collected   += p.amountPaid;
    cur.outstanding += outs;
    cur.waived      += p.waivedAmount;
    cur.statuses.push(p.status);

    if (p.paymentDate) {
      if (!cur.lastPaymentDate || p.paymentDate > cur.lastPaymentDate) {
        cur.lastPaymentDate = p.paymentDate;
        cur.lastPaymentAmt  = p.amountPaid;
      }
    }

    if (p.feeStructure.dueDate && outs > 0) {
      if (!cur.nextDueDate || p.feeStructure.dueDate < cur.nextDueDate) {
        cur.nextDueDate = p.feeStructure.dueDate;
      }
    }

    cur.payments.push({
      id:             p.id,
      category:       p.feeStructure.feeCategory.name,
      amount:         p.feeStructure.amount,
      paid:           p.amountPaid,
      waived:         p.waivedAmount,
      outstanding:    outs,
      status:         p.status,
      dueDate:        p.feeStructure.dueDate,
      paymentDate:    p.paymentDate,
      paymentMode:    p.paymentMode,
      transactionRef: p.transactionRef,
    });

    studentMap.set(key, cur);
  }

  // ── Determine composite status per student ────────────────────
  let students = Array.from(studentMap.values()).map((s) => {
    const allPaid    = s.statuses.every(st => st === "PAID" || st === "WAIVED");
    const anyPending = s.statuses.some(st => st === "PENDING" || st === "PARTIAL");
    const isOverdue  = s.nextDueDate && s.nextDueDate < today && anyPending;
    const compositeStatus =
      allPaid    ? "PAID"    :
      isOverdue  ? "OVERDUE" :
      anyPending ? "PENDING" : "PARTIAL";
    const paidPct = s.totalFee > 0
      ? Math.round(((s.collected + s.waived) / s.totalFee) * 100)
      : 100;

    return {
      ...s,
      compositeStatus,
      paidPct,
      lastPaymentDate: s.lastPaymentDate?.toISOString() ?? null,
      nextDueDate:     s.nextDueDate?.toISOString() ?? null,
      payments:        s.payments.map(pay => ({
        ...pay,
        dueDate:     pay.dueDate?.toISOString()     ?? null,
        paymentDate: pay.paymentDate?.toISOString() ?? null,
      })),
    };
  });

  // ── Apply filters ─────────────────────────────────────────────
  if (status === "PAID")    students = students.filter(s => s.compositeStatus === "PAID");
  if (status === "PENDING") students = students.filter(s => s.compositeStatus === "PENDING" || s.compositeStatus === "PARTIAL");
  if (status === "OVERDUE") students = students.filter(s => s.compositeStatus === "OVERDUE");

  if (search) {
    students = students.filter(s =>
      s.name.toLowerCase().includes(search) ||
      s.rollNumber?.toLowerCase().includes(search) ||
      s.sectionLabel.toLowerCase().includes(search),
    );
  }

  // Sort: overdue first, then pending, then paid; within each group: by outstanding desc
  const ORDER = { OVERDUE: 0, PENDING: 1, PARTIAL: 2, PAID: 3 };
  students.sort((a, b) => {
    const oa = ORDER[a.compositeStatus as keyof typeof ORDER] ?? 4;
    const ob = ORDER[b.compositeStatus as keyof typeof ORDER] ?? 4;
    if (oa !== ob) return oa - ob;
    return b.outstanding - a.outstanding;
  });

  // ── Recent payments timeline (last 20) ────────────────────────
  const recentPayments = allPayments
    .filter(p => p.amountPaid > 0)
    .sort((a, b) => (b.paymentDate ?? b.createdAt).getTime() - (a.paymentDate ?? a.createdAt).getTime())
    .slice(0, 20)
    .map(p => ({
      id:             p.id,
      studentName:    p.studentProfile.user.name,
      category:       p.feeStructure.feeCategory.name,
      amount:         p.amountPaid,
      paymentMode:    p.paymentMode,
      paymentDate:    (p.paymentDate ?? p.createdAt).toISOString(),
      status:         p.status,
      transactionRef: p.transactionRef,
    }));

  // ── Classes for filter dropdown ───────────────────────────────
  const classes = await prisma.class.findMany({
    where:   { schoolId },
    orderBy: { name: "asc" },
    select:  { id: true, name: true },
  });

  // ── Academic years ────────────────────────────────────────────
  const academicYears = await prisma.academicYear.findMany({
    where:   { schoolId },
    orderBy: { startDate: "desc" },
    select:  { id: true, name: true, isCurrent: true },
  });

  return NextResponse.json({
    kpis: {
      totalFee,
      collected,
      outstanding,
      overdue,
      waived,
      todayCollection,
      todayCount,
      collectionRate: totalFee > 0 ? Math.round((collected / totalFee) * 100) : 0,
    },
    monthlyTrend,
    byMode,
    students,
    recentPayments,
    classes,
    academicYears,
    total: students.length,
  });
}