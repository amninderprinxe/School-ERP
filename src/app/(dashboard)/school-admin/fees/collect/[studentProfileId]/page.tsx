import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import { notFound }          from "next/navigation";
import Link                  from "next/link";
import { ArrowLeft }         from "lucide-react";
import {
  PaymentRecordForm,
  type PaymentFormData,
}                            from "@/components/school-admin/payment-record-form";
import {
  fmtCurrency,
  calcOutstanding,
  STATUS_STYLE,
  STATUS_LABEL,
  PAYMENT_MODE_LABELS,
}                            from "@/lib/fee-utils";

export const metadata = { title: "Student Fee Ledger" };
interface Props { params: Promise<{ studentProfileId: string }> }

export default async function StudentFeeLedgerPage({ params }: Props) {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return <p className="p-8 text-red-500">No school assigned.</p>;

  const { studentProfileId } = await params;

  // Verify student belongs to this school
  const student = await prisma.studentProfile.findFirst({
    where:   { id: studentProfileId, user: { schoolId } },
    include: {
      user:    { select: { name: true, email: true } },
      section: { include: { class: true } },
    },
  });
  if (!student) notFound();

  // All existing payments for this student
  const existingPayments = await prisma.feePayment.findMany({
    where:   { schoolId, studentProfileId },
    include: {
      feeStructure: {
        include: { feeCategory: true, class: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // All applicable fee structures (for this student's class + school-wide)
  const applicableStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      OR: [
        { classId: student.section?.classId ?? "__none__" },
        { classId: null },
      ],
    },
    include: {
      feeCategory: true,
      class:       true,
    },
  });

  const paymentMap = new Map(existingPayments.map((p) => [p.feeStructureId, p]));

  const sectionLabel = student.section
    ? `${student.section.class.name} — Section ${student.section.name}`
    : "No section";

  // Summary
  const totalDue        = existingPayments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid       = existingPayments.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = existingPayments.reduce(
    (s, p) => s + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount), 0,
  );

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/school-admin/fees/collect"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">{student.user.name} · {sectionLabel}</p>
        </div>
      </div>

      {/* Student summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500
            rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
            {student.user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900">{student.user.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{student.user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sectionLabel}</p>
          </div>
          <div className="hidden sm:flex items-center gap-5 shrink-0">
            {[
              { label: "Total Due",   value: fmtCurrency(totalDue),         color: "text-gray-900" },
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

      {/* Per-structure payment forms */}
      {applicableStructures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center">
          <p className="text-sm text-gray-500">No fee structures applicable for this student.</p>
          <p className="text-xs text-gray-400 mt-1">
            Create fee structures for this student's class first.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {applicableStructures.map((structure) => {
            const payment = paymentMap.get(structure.id);
            const formData: PaymentFormData = {
              feePaymentId:     payment?.id            ?? null,
              studentProfileId: studentProfileId,
              feeStructureId:   structure.id,
              structureName:    `${structure.feeCategory.name} (${structure.academicYear})`,
              structureAmount:  structure.amount,
              amountPaid:       payment?.amountPaid    ?? 0,
              waivedAmount:     payment?.waivedAmount  ?? 0,
            };
            const outstanding = payment
              ? calcOutstanding(structure.amount, payment.amountPaid, payment.waivedAmount)
              : structure.amount;

            return (
              <div key={structure.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Structure header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {structure.feeCategory.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {structure.class?.name ?? "All Classes"} · {structure.academicYear}
                      {structure.description ? ` · ${structure.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-gray-900">
                      {fmtCurrency(structure.amount)}
                    </span>
                    {payment && (
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full
                        ${STATUS_STYLE[payment.status]}`}>
                        {STATUS_LABEL[payment.status]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Existing payment info */}
                {payment && payment.amountPaid > 0 && (
                  <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex
                    flex-wrap gap-4 text-xs text-gray-600">
                    <span>Paid: <strong className="text-emerald-700">{fmtCurrency(payment.amountPaid)}</strong></span>
                    {payment.waivedAmount > 0 && (
                      <span>Waived: <strong>{fmtCurrency(payment.waivedAmount)}</strong></span>
                    )}
                    <span>Outstanding: <strong className={outstanding > 0 ? "text-red-600" : "text-emerald-700"}>
                      {fmtCurrency(outstanding)}
                    </strong></span>
                    {payment.paymentMode && (
                      <span>Mode: <strong>{PAYMENT_MODE_LABELS[payment.paymentMode]}</strong></span>
                    )}
                    {payment.transactionRef && (
                      <span>Ref: <strong>{payment.transactionRef}</strong></span>
                    )}
                  </div>
                )}

                {/* Payment form */}
                <div className="px-6 py-5">
                  <PaymentRecordForm data={formData} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}