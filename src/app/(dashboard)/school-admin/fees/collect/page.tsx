import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import Link               from "next/link";
import {
  CreditCard,
  ChevronDown,
  AlertCircle,
}                         from "lucide-react";
import {
  fmtCurrency,
  calcOutstanding,
  STATUS_STYLE,
  STATUS_LABEL,
}                         from "@/lib/fee-utils";
import type { PaymentStatus } from "@prisma/client";

export const metadata = { title: "Record Payments" };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "",         label: "All Statuses" },
  { value: "PENDING",  label: "Pending"  },
  { value: "PARTIAL",  label: "Partial"  },
  { value: "PAID",     label: "Paid"     },
  { value: "WAIVED",   label: "Waived"   },
];

interface Props {
  searchParams: Promise<{
    structureId?: string;
    status?:      string;
  }>;
}

export default async function FeeCollectPage({ searchParams }: Props) {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return <p className="p-8 text-red-500">No school assigned.</p>;

  const sp          = await searchParams;
  const structureId = sp.structureId ?? "";
  const statusFilter = STATUS_OPTIONS.some((o) => o.value === (sp.status ?? ""))
    ? sp.status ?? ""
    : "";

  const structures = await prisma.feeStructure.findMany({
    where:   { schoolId },
    include: { feeCategory: true, class: true },
    orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
  });

  const selectedStructure = structures.find((s) => s.id === structureId);

  const payments = selectedStructure
    ? await prisma.feePayment.findMany({
        where: {
          schoolId,
          feeStructureId: structureId,
          ...(statusFilter && { status: statusFilter as PaymentStatus }),
        },
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true } },
              section: { include: { class: true } },
            },
          },
          feeStructure: { select: { amount: true } },
        },
        orderBy: [
          { status:          "asc" },
          { studentProfile:  { user: { name: "asc" } } },
        ],
      })
    : [];

  // Summary
  const total        = payments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const collected    = payments.reduce((s, p) => s + p.amountPaid, 0);
  const outstanding  = payments.reduce(
    (s, p) => s + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount), 0,
  );
  const atRiskCount  = payments.filter(
    (p) => p.status === "PENDING" || p.status === "PARTIAL",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a fee structure to see student payment status
        </p>
      </div>

      {/* Filters */}
      <form method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <select name="structureId" defaultValue={structureId}
              className="w-full appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500">
              <option value="">— Select fee structure —</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.feeCategory.name} — {s.class?.name ?? "All Classes"} ({s.academicYear})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
              text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select name="status" defaultValue={statusFilter}
              className="appearance-none border border-gray-300 rounded-lg px-3
                py-2.5 pr-9 text-sm bg-white focus:outline-none focus:ring-2
                focus:ring-blue-500">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
              text-gray-400 pointer-events-none" />
          </div>
          <button type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
              text-sm font-semibold rounded-lg transition-colors">
            Filter
          </button>
          <a href="/school-admin/fees/collect"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600
              text-sm font-medium rounded-lg transition-colors inline-flex items-center">
            Clear
          </a>
        </div>
      </form>

      {/* No structure selected */}
      {!selectedStructure && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Select a fee structure above</p>
          <p className="text-xs text-gray-400 mt-1">
            Then click on a student to record their payment.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {selectedStructure && payments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Due",     value: fmtCurrency(total),       color: "text-gray-900" },
            { label: "Collected",     value: fmtCurrency(collected),   color: "text-emerald-700" },
            { label: "Outstanding",   value: fmtCurrency(outstanding), color: outstanding > 0 ? "text-red-600" : "text-emerald-700" },
            { label: "Needs Action",  value: atRiskCount,             color: atRiskCount > 0 ? "text-amber-700" : "text-gray-500" },
          ].map((item) => (
            <div key={item.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payments table */}
      {selectedStructure && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              {selectedStructure.feeCategory.name} — {selectedStructure.class?.name ?? "All Classes"} ({selectedStructure.academicYear})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {fmtCurrency(selectedStructure.amount)} per student · {payments.length} record{payments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {payments.length === 0 ? (
            <div className="py-14 text-center">
              <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No payment records found</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &ldquo;Assign → Students&rdquo; on the Structures page first.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["#", "Student", "Section", "Paid", "Outstanding", "Status", ""].map((h) => (
                      <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500
                        uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p, i) => {
                    const outstanding = calcOutstanding(
                      p.feeStructure.amount, p.amountPaid, p.waivedAmount,
                    );
                    const sec = p.studentProfile.section;
                    return (
                      <tr key={p.id}
                        className={`transition-colors ${
                          p.status === "PENDING" ? "bg-amber-50/20" : "hover:bg-gray-50/50"
                        }`}>
                        <td className="px-5 py-3.5 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-green-100 text-green-700 text-xs
                              font-bold rounded-full flex items-center justify-center shrink-0">
                              {p.studentProfile.user.name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[140px]">
                              {p.studentProfile.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {sec ? (
                            <span className="px-2 py-0.5 text-xs font-medium
                              bg-blue-50 text-blue-700 rounded-full">
                              {sec.class.name}-{sec.name}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-700">
                          {fmtCurrency(p.amountPaid)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-red-600">
                          {outstanding > 0 ? fmtCurrency(outstanding) : (
                            <span className="text-emerald-600">Nil</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 text-xs font-semibold
                            rounded-full ${STATUS_STYLE[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/school-admin/fees/collect/${p.studentProfile.id}`}
                            className="inline-flex items-center px-3 py-1.5 text-xs
                              font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100
                              rounded-lg transition-colors">
                            Record ›
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
