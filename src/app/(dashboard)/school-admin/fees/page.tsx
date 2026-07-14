import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import Link              from "next/link";
import {
  Wallet, Tag, ListOrdered, CreditCard,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
}                        from "lucide-react";
import {
  fmtCurrency,
  STATUS_STYLE,
  STATUS_LABEL,
}                        from "@/lib/fee-utils";

export const metadata = { title: "Fee Management" };

export default async function FeesOverviewPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);

  // Fetch live schoolId from DB
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return <p className="p-8 text-red-500">No school assigned.</p>;

  const [payments, categoryCount, structureCount] = await Promise.all([
    prisma.feePayment.findMany({
      where:   { schoolId },
      include: { feeStructure: { select: { amount: true } } },
    }),
    prisma.feeCategory.count({ where: { schoolId } }),
    prisma.feeStructure.count({ where: { schoolId } }),
  ]);

  // Compute summary
  const totalDue         = payments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalCollected   = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalWaived      = payments.reduce((s, p) => s + p.waivedAmount, 0);
  const totalOutstanding = Math.max(0, totalDue - totalCollected - totalWaived);

  const statusCounts = payments.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }),
    {},
  );

  // Recent payments
  const recentPayments = await prisma.feePayment.findMany({
    where:   { schoolId, amountPaid: { gt: 0 } },
    include: {
      studentProfile: { include: { user: { select: { name: true } } } },
      feeStructure:   { include: { feeCategory: true } },
    },
    orderBy: { updatedAt: "desc" },
    take:    8,
  });

  const QUICK_LINKS = [
    { label: "Fee Categories", href: "/school-admin/fees/categories", icon: Tag,         color: "text-purple-700", bg: "bg-purple-50", count: categoryCount },
    { label: "Fee Structures", href: "/school-admin/fees/structures", icon: ListOrdered, color: "text-indigo-700", bg: "bg-indigo-50", count: structureCount },
    { label: "Record Payment", href: "/school-admin/fees/collect",    icon: CreditCard,  color: "text-blue-700",   bg: "bg-blue-50",   count: null },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Collection overview for your school</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Fees Due",  value: fmtCurrency(totalDue),         icon: Wallet,      color: "text-gray-900",   bg: "bg-gray-50"   },
          { label: "Collected",       value: fmtCurrency(totalCollected),    icon: TrendingUp,  color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Outstanding",     value: fmtCurrency(totalOutstanding),  icon: Clock,       color: totalOutstanding > 0 ? "text-red-600" : "text-emerald-700", bg: totalOutstanding > 0 ? "bg-red-50" : "bg-emerald-50" },
          { label: "Waived",          value: fmtCurrency(totalWaived),       icon: CheckCircle2, color: "text-blue-700",  bg: "bg-blue-50"   },
        ].map((item) => (
          <div key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      {payments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["PENDING", "PARTIAL", "PAID", "WAIVED"] as const).map((s) => {
            const cnt = statusCounts[s] ?? 0;
            if (cnt === 0) return null;
            return (
              <span key={s}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
                  font-semibold rounded-full ${STATUS_STYLE[s]}`}>
                {STATUS_LABEL[s]} <span className="font-bold">{cnt}</span>
              </span>
            );
          })}
          <span className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full">
            Total: {payments.length} records
          </span>
        </div>
      )}

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5
              hover:border-blue-200 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 ${link.bg} rounded-xl flex items-center justify-center`}>
                <link.icon className={`w-5 h-5 ${link.color}`} />
              </div>
              {link.count !== null && (
                <span className="text-2xl font-bold text-gray-900">{link.count}</span>
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {link.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Payments</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest recorded fee payments</p>
          </div>
          <Link href="/school-admin/fees/collect"
            className="text-xs font-semibold text-blue-600 hover:underline">
            View All →
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No payments recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3.5
                hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 text-xs
                    font-bold rounded-full flex items-center justify-center shrink-0">
                    {p.studentProfile.user.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.studentProfile.user.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.feeStructure.feeCategory.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    {fmtCurrency(p.amountPaid)}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLE[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}