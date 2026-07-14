"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { recordPayment }           from "@/action/fee.actions";
import {
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  fmtCurrency,
  calcOutstanding,
  calcNewStatus,
  STATUS_LABEL,
  STATUS_STYLE,
}                                  from "@/lib/fee-utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface PaymentFormData {
  feePaymentId:     string | null;
  studentProfileId: string;
  feeStructureId:   string;
  structureName:    string;
  structureAmount:  number;
  amountPaid:       number;
  waivedAmount:     number;
}

interface Props {
  data: PaymentFormData;
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const today = new Date().toISOString().split("T")[0]!;

export function PaymentRecordForm({ data }: Props) {
  const router                         = useRouter();
  const [isPending,    startTransition] = useTransition();
  const [amountPaid,   setAmountPaid]   = useState(data.amountPaid.toString());
  const [waivedAmount, setWaivedAmount] = useState(data.waivedAmount.toString());
  const [paymentDate,  setPaymentDate]  = useState(today);
  const [paymentMode,  setPaymentMode]  = useState("CASH");
  const [transRef,     setTransRef]     = useState("");
  const [remarks,      setRemarks]      = useState("");
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const paid     = parseFloat(amountPaid)   || 0;
  const waived   = parseFloat(waivedAmount) || 0;
  const outstanding = calcOutstanding(data.structureAmount, paid, waived);
  const previewStatus = calcNewStatus(data.structureAmount, paid, waived);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await recordPayment({
        studentProfileId: data.studentProfileId,
        feeStructureId:   data.feeStructureId,
        amountPaid:       paid,
        waivedAmount:     waived,
        paymentMode,
        paymentDate,
        transactionRef:   transRef.trim() || undefined,
        remarks:          remarks.trim()  || undefined,
      });
      if (res.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Live calculation strip */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        {[
          { label: "Fee Amount",   value: fmtCurrency(data.structureAmount), color: "text-gray-900" },
          { label: "Paid",         value: fmtCurrency(paid),                  color: "text-emerald-700" },
          { label: "Outstanding",  value: fmtCurrency(outstanding),           color: outstanding > 0 ? "text-red-600" : "text-emerald-700" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Preview status */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Preview status:</span>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${STATUS_STYLE[previewStatus]}`}>
          {STATUS_LABEL[previewStatus]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount Paid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Total Amount Paid (₹) <span className="text-red-500">*</span>
          </label>
          <input type="number" required min={0} step="0.01"
            max={data.structureAmount}
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className={INPUT} />
          <p className="text-xs text-gray-400 mt-1">Cumulative total paid (not just today)</p>
        </div>

        {/* Waived Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Waived Amount (₹)
          </label>
          <input type="number" min={0} step="0.01"
            max={data.structureAmount}
            value={waivedAmount}
            onChange={(e) => setWaivedAmount(e.target.value)}
            className={INPUT} />
          <p className="text-xs text-gray-400 mt-1">Amount officially waived by school</p>
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <input type="date" required value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className={INPUT} />
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Payment Mode
          </label>
          <select value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={`${INPUT} bg-white`}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>{PAYMENT_MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>

        {/* Transaction Ref */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Transaction Ref <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input type="text" value={transRef}
            onChange={(e) => setTransRef(e.target.value)}
            placeholder="Bank ref, receipt no…" className={INPUT} />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Remarks <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input type="text" value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Notes about this payment…" className={INPUT} />
        </div>
      </div>

      {/* Feedback */}
      {saved && (
        <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border
          border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Payment recorded successfully!</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border
          border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600
          hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold
          rounded-lg transition-colors">
        {isPending ? "Saving…" : "Save Payment"}
      </button>
    </form>
  );
}