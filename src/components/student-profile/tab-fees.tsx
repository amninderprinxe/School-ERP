"use client";

import { useMemo }    from "react";
import { color, motion }     from "framer-motion";
import { cn }         from "@/lib/utils";
import {
  CheckCircle2, Clock, AlertCircle, Wallet,
}                     from "lucide-react";
import type { StudentProfileData } from "./types";
import { calcOutstanding }         from "@/lib/fee-utils";
import React from "react";
import { string } from "zod";

// ── Format helpers ────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PAID:    { label: "Paid",    color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  PARTIAL: { label: "Partial", color: "text-blue-700 bg-blue-50 border-blue-200",          icon: Clock        },
  PENDING: { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200",        icon: AlertCircle  },
  WAIVED:  { label: "Waived",  color: "text-gray-600 bg-gray-50 border-gray-200",           icon: CheckCircle2 },
};

const MODE_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque", ONLINE: "Online",
};

// ─────────────────────────────────────────────────────────────────

export function TabFees({ data }: { data: StudentProfileData }) {
  const { feePayments, profile } = data;

  const totalFee    = feePayments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid   = feePayments.reduce((s, p) => s + p.amountPaid, 0);
  const totalWaived = feePayments.reduce((s, p) => s + p.waivedAmount, 0);
  const totalOuts   = feePayments.reduce((s, p) =>
    s + calcOutstanding(p.feeStructure.amount, p.amountPaid, p.waivedAmount), 0);
  const paidCount   = feePayments.filter((p) => p.status === "PAID").length;
  const pendingCount = feePayments.filter(
    (p) => p.status === "PENDING" || p.status === "PARTIAL",
  ).length;

  const overallPct = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 100;

  if (feePayments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" aria-hidden />
        <p className="text-sm font-medium text-gray-500">No fee records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Overall progress ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-indigo-600 to-blue-700
          rounded-2xl p-6 text-white"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[12px] font-semibold text-white/70 uppercase tracking-wide">
              Total Fee Status
            </p>
            <p className="text-4xl font-black mt-1 tabular-nums">
              {overallPct}%
            </p>
            <p className="text-[13px] text-white/80 mt-1">
              {fmtCurrency(totalPaid)} paid of {fmtCurrency(totalFee)}
            </p>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-2xl font-extrabold",
              totalOuts > 0 ? "text-amber-300" : "text-emerald-300",
            )}>
              {totalOuts > 0 ? fmtCurrency(totalOuts) : "All Clear!"}
            </p>
            <p className="text-[12px] text-white/70 mt-0.5">
              {totalOuts > 0 ? "outstanding balance" : "no pending dues"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full bg-emerald-400"
          />
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-4 flex-wrap">
          {[
            { label: "Total Due",    value: fmtCurrency(totalFee)    },
            { label: "Paid",         value: fmtCurrency(totalPaid)   },
            { label: "Waived",       value: fmtCurrency(totalWaived) },
            { label: "Outstanding",  value: fmtCurrency(totalOuts)   },
            { label: `${paidCount}/${feePayments.length}`, label2: "paid" },
          ]
            .filter((_, i) => i < 4)
            .map((s) => (
              <div key={s.label}>
                <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-[14px] font-bold text-white mt-0.5">{s.value}</p>
              </div>
            ))}
        </div>
      </motion.div>

      {/* ── Per-fee progress cards ─────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[13px] font-bold text-gray-700 px-1">Fee Breakdown</p>
        {feePayments.map((p, i) => {
          const outstanding = calcOutstanding(
            p.feeStructure.amount, p.amountPaid, p.waivedAmount,
          );
          const pct = p.feeStructure.amount > 0
            ? Math.round((p.amountPaid / p.feeStructure.amount) * 100)
            : 100;
          const cfg = STATUS_CFG[p.status] ?? STATUS_CFG["PENDING"]!;
          const Icon = cfg.icon;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0   }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-gray-100
                shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 leading-snug">
                    {p.feeStructure.feeCategory.name}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {p.feeStructure.academicYear}
                    {p.feeStructure.description && ` · ${p.feeStructure.description}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1",
                    "text-[11px] font-bold rounded-full border shrink-0",
                    cfg.color,
                  )}
                >
                  <Icon className="w-3 h-3" aria-hidden />
                  {cfg.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    p.status === "PAID"   ? "bg-emerald-500" :
                    p.status === "PARTIAL"? "bg-blue-500"    :
                    p.status === "WAIVED" ? "bg-gray-400"    :
                    "bg-amber-500",
                  )}
                />
              </div>

              {/* Amounts row */}
              <div className="flex flex-wrap gap-4 text-[12px]">
                <div>
                  <p className="text-gray-400 font-medium">Total Due</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {fmtCurrency(p.feeStructure.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Paid</p>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {fmtCurrency(p.amountPaid)}
                  </p>
                </div>
                {p.waivedAmount > 0 && (
                  <div>
                    <p className="text-gray-400 font-medium">Waived</p>
                    <p className="font-bold text-gray-600 mt-0.5">
                      {fmtCurrency(p.waivedAmount)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 font-medium">Balance</p>
                  <p className={cn(
                    "font-bold mt-0.5",
                    outstanding > 0 ? "text-red-600" : "text-emerald-700",
                  )}>
                    {outstanding > 0 ? fmtCurrency(outstanding) : "Nil"}
                  </p>
                </div>
                {p.paymentDate && (
                  <div className="ml-auto text-right">
                    <p className="text-gray-400 font-medium">Last Payment</p>
                    <p className="font-semibold text-gray-700 mt-0.5">
                      {fmtDate(p.paymentDate)}
                    </p>
                    <p className="text-gray-400 mt-0.5">
                      {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                    </p>
                  </div>
                )}
              </div>

              {p.transactionRef && (
                <p className="text-[11px] text-gray-400 font-mono mt-2 pt-2 border-t border-gray-50">
                  Ref: {p.transactionRef}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Payment history table ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-[14px] font-bold text-gray-900">Payment History</p>
          
        <a href={`/api/pdf/fee-receipt?studentProfileId=${profile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-blue-600 hover:text-blue-800
              transition-colors"
          >
            Download Receipt →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Fee Category", "Amount Paid", "Mode", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[11px] font-semibold text-gray-500
                      uppercase tracking-wide text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {feePayments
                .filter((p) => p.amountPaid > 0 || p.status === "WAIVED")
                .map((p) => {
                  const cfg  = STATUS_CFG[p.status] ?? STATUS_CFG["PENDING"]!;
                  const Icon = cfg.icon;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {p.feeStructure.feeCategory.name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {p.feeStructure.academicYear}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-bold text-emerald-700">
                          {fmtCurrency(p.amountPaid)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600">
                        {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600">
                        {fmtDate(p.paymentDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5",
                          "text-[10px] font-bold rounded-full border",
                          cfg.color,
                        )}>
                          <Icon className="w-2.5 h-2.5" aria-hidden />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}