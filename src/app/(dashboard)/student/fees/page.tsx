import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import {
  fmtCurrency,
  calcOutstanding,
  STATUS_STYLE,
  STATUS_LABEL,
  PAYMENT_MODE_LABELS,
}                         from "@/lib/fee-utils";
import { Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata = { title: "My Fees" };

export default async function StudentFeesPage() {
  const user     = await requireRole(["STUDENT"]);
  const schoolId = user.schoolId!;

  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: { section: { include: { class: true } } },
  });

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Student profile not found.</p>
          <p className="text-xs text-gray-400 mt-1">Contact your school admin.</p>
        </div>
      </div>
    );
  }

  const payments = await prisma.feePayment.findMany({
    where:   { studentProfileId: studentProfile.id, schoolId },
    include: {
      feeStructure: {
        include: { feeCategory: true, class: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDue        = payments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid       = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = payments.reduce(
    (s, p) => s + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount), 0,
  );
  const totalWaived = payments.reduce((s, p) => s + p.waivedAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {studentProfile.section
            ? `${studentProfile.section.class.name} — Section ${studentProfile.section.name}`
            : "Your fee ledger"}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Fees",    value: fmtCurrency(totalDue),         icon: Wallet,       color: "text-gray-900",   bg: "bg-gray-50" },
          { label: "Paid",          value: fmtCurrency(totalPaid),        icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Outstanding",   value: fmtCurrency(totalOutstanding), icon: Clock,        color: totalOutstanding > 0 ? "text-red-600" : "text-emerald-700", bg: totalOutstanding > 0 ? "bg-red-50" : "bg-emerald-50" },
          { label: "Waived",        value: fmtCurrency(totalWaived),      icon: AlertCircle,  color: "text-blue-700",   bg: "bg-blue-50" },
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

      {/* Fee records */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Fee Details</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {payments.length} fee record{payments.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="py-14 text-center">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No fee records yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Fee records will appear here once your school admin assigns them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((p) => {
              const outstanding = calcOutstanding(
                p.feeStructure.amount, p.amountPaid, p.waivedAmount,
              );
              return (
                <div key={p.id}
                  className={`px-6 py-5 ${p.status === "PENDING" ? "bg-amber-50/20" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">
                          {p.feeStructure.feeCategory.name}
                        </p>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${STATUS_STYLE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {p.feeStructure.class?.name ?? "All Classes"} · {p.feeStructure.academicYear}
                        {p.feeStructure.description ? ` · ${p.feeStructure.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {fmtCurrency(p.feeStructure.amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Total fee amount</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Amount Paid",  value: fmtCurrency(p.amountPaid),  color: "text-emerald-700" },
                      { label: "Waived",       value: fmtCurrency(p.waivedAmount), color: "text-blue-700" },
                      { label: "Outstanding",  value: fmtCurrency(outstanding),    color: outstanding > 0 ? "text-red-600" : "text-emerald-700" },
                      { label: "Payment Mode", value: p.paymentDate ? PAYMENT_MODE_LABELS[p.paymentMode] : "—", color: "text-gray-700" },
                    ].map((item) => (
                      <div key={item.label}
                        className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                          {item.label}
                        </p>
                        <p className={`text-sm font-bold mt-1 ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {p.transactionRef && (
                    <p className="text-xs text-gray-400 mt-3">
                      Ref: <span className="font-mono font-semibold text-gray-600">{p.transactionRef}</span>
                    </p>
                  )}
                  {p.remarks && (
                    <p className="text-xs text-gray-500 mt-1">Note: {p.remarks}</p>
                  )}
                  {outstanding > 0 && p.status !== "WAIVED" && (
                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50
                      border border-amber-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">
                        {fmtCurrency(outstanding)} outstanding — please pay at the school office.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}