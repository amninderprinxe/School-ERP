import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import {
  ChildSelector,
  type ChildOption,
}                         from "@/components/results/child-selector";
import {
  fmtCurrency,
  calcOutstanding,
  STATUS_STYLE,
  STATUS_LABEL,
}                         from "@/lib/fee-utils"; 
import { Baby, Wallet, Clock, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Children's Fees" };
interface Props { searchParams: Promise<{ childId?: string }> }

export default async function ParentFeesPage({ searchParams }: Props) {
  const user     = await requireRole(["PARENT"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;

  const parentProfile = await prisma.parentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true } },
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    return <div className="py-24 text-center"><p className="text-sm text-gray-500">Parent profile not found.</p></div>;
  }

  const linked = parentProfile.children;
  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Children&apos;s Fees</h1></div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <Baby className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No children linked</p>
        </div>
      </div>
    );
  }

  const validIds = new Set(linked.map((c) => c.studentProfileId));
  const selectedId = sp.childId && validIds.has(sp.childId)
    ? sp.childId
    : linked[0]!.studentProfileId;

  const selectedLink  = linked.find((c) => c.studentProfileId === selectedId)!;
  const selectedChild = selectedLink.studentProfile;

  // Security: verify child belongs to same school
  const childUser = await prisma.user.findUnique({
    where:  { id: selectedChild.userId },
    select: { schoolId: true },
  });
  if (!childUser || childUser.schoolId !== schoolId) {
    return <p className="p-8 text-red-500">Access denied.</p>;
  }

  const childOptions: ChildOption[] = linked.map((c) => ({
    studentProfileId: c.studentProfileId,
    name:             c.studentProfile.user.name,
    relation:         c.relation,
  }));

  const payments = await prisma.feePayment.findMany({
    where:   { studentProfileId: selectedId, schoolId },
    include: { feeStructure: { include: { feeCategory: true, class: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalDue        = payments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid       = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = payments.reduce(
    (s, p) => s + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount), 0,
  );

  const sectionLabel = selectedChild.section
    ? `${selectedChild.section.class.name} — Section ${selectedChild.section.name}`
    : "No section";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Children&apos;s Fees</h1>
        <p className="text-sm text-gray-500 mt-0.5">View fee details for your children</p>
      </div>

      {linked.length > 1 && (
        <ChildSelector children={childOptions} selectedId={selectedId} basePath="/parent/fees" />
      )}

      {/* Child info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500
            rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
            {selectedChild.user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-gray-900">{selectedChild.user.name}</p>
              {selectedLink.relation && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                  {selectedLink.relation}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {[
              { label: "Due",         value: fmtCurrency(totalDue),         color: "text-gray-900" },
              { label: "Paid",        value: fmtCurrency(totalPaid),        color: "text-emerald-700" },
              { label: "Outstanding", value: fmtCurrency(totalOutstanding), color: totalOutstanding > 0 ? "text-red-600" : "text-emerald-700" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Due",    value: fmtCurrency(totalDue),         icon: Wallet,       color: "text-gray-900",    bg: "bg-gray-50" },
          { label: "Paid",         value: fmtCurrency(totalPaid),        icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Outstanding",  value: fmtCurrency(totalOutstanding), icon: Clock,        color: totalOutstanding > 0 ? "text-red-600" : "text-emerald-700", bg: totalOutstanding > 0 ? "bg-red-50" : "bg-emerald-50" },
        ].map((item) => (
          <div key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fee records */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Fee Records</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {payments.length} record{payments.length !== 1 ? "s" : ""} for {selectedChild.user.name}
          </p>
        </div>
        {payments.length === 0 ? (
          <div className="py-14 text-center">
            <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No fee records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Fee", "Year", "Amount", "Paid", "Outstanding", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500
                      uppercase tracking-wide text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => {
                  const outstanding = calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {p.feeStructure.feeCategory.name}
                        {p.feeStructure.class && (
                          <span className="text-xs text-gray-400 ml-1.5">({p.feeStructure.class.name})</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-500">
                        {p.feeStructure.academicYear}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {fmtCurrency(p.feeStructure.amount)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-700">
                        {fmtCurrency(p.amountPaid)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold">
                        <span className={outstanding > 0 ? "text-red-600" : "text-emerald-600"}>
                          {outstanding > 0 ? fmtCurrency(outstanding) : "Nil"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}