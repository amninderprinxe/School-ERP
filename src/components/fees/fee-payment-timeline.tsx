"use client";

import { motion }            from "framer-motion";
import {
  CheckCircle2, CreditCard, Clock,
  Banknote, Building2, Globe, FileText,
}                            from "lucide-react";
import { cn }                from "@/lib/utils";
import { fmtInr }            from "./fee-kpi-strip";
import type { RecentPayment } from "./types";

// ── Mode icon ─────────────────────────────────────────────────────

function ModeIcon({ mode }: { mode: string }) {
  if (mode === "CASH")          return <Banknote  className="w-3.5 h-3.5" aria-hidden />;
  if (mode === "BANK_TRANSFER") return <Building2 className="w-3.5 h-3.5" aria-hidden />;
  if (mode === "ONLINE")        return <Globe     className="w-3.5 h-3.5" aria-hidden />;
  if (mode === "CHEQUE")        return <FileText  className="w-3.5 h-3.5" aria-hidden />;
  return <CreditCard className="w-3.5 h-3.5" aria-hidden />;
}

const MODE_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque", ONLINE: "Online",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d    = Math.floor(diff / 86_400_000);
  const h    = Math.floor(diff / 3_600_000);
  const m    = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────

export function PaymentTimeline({ payments }: { payments: RecentPayment[] }) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl
      border border-gray-100 dark:border-gray-700/60
      shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden">

      <div className="flex items-center justify-between px-5 py-4
        border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
            Payment Timeline
          </p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
            Recent fee collections
          </p>
        </div>
        <span className="text-[11px] font-semibold text-gray-400
          bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-full">
          {payments.length} recent
        </span>
      </div>

      {payments.length === 0 ? (
        <div className="py-12 text-center">
          <Clock className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" aria-hidden />
          <p className="text-sm text-gray-400 dark:text-gray-500">No payments yet</p>
        </div>
      ) : (
        <div className="relative px-5 py-4">
          {/* Vertical line */}
          <div className="absolute left-8 top-4 bottom-4 w-px
            bg-gray-100 dark:bg-gray-700/60" />

          <div className="space-y-1">
            {payments.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0   }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className="relative flex items-start gap-3 pl-3 pr-2 py-3
                  rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40
                  transition-colors group"
              >
                {/* Timeline dot */}
                <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-100
                  dark:bg-emerald-950/50 border-2 border-emerald-300
                  dark:border-emerald-700 flex items-center justify-center
                  shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900
                        dark:text-gray-100 leading-snug truncate">
                        {p.studentName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400
                        mt-0.5 truncate">
                        {p.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-extrabold text-emerald-700
                        dark:text-emerald-400 tabular-nums">
                        {fmtInr(p.amount)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {relTime(p.paymentDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-medium
                      text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700
                      px-2 py-0.5 rounded-full">
                      <ModeIcon mode={p.paymentMode} />
                      {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                    </span>
                    {p.transactionRef && (
                      <span className="text-[10px] font-mono text-gray-400
                        dark:text-gray-500 truncate max-w-[100px]">
                        {p.transactionRef}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-auto">
                      {fmtDate(p.paymentDate)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}