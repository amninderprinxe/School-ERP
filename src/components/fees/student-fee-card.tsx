"use client";

import { useState }         from "react";
import { motion }           from "framer-motion";
import Link                 from "next/link";
import {
  ChevronDown, ChevronUp, FileDown, Wallet,
  CalendarDays, CheckCircle2, Clock,
  AlertTriangle, CreditCard, ArrowRight,
}                           from "lucide-react";
import { cn }               from "@/lib/utils";
import { fmtInr }           from "./fee-kpi-strip";
import type { StudentFeeRecord, StudentFeePayment } from "./types";

// ── Status config ─────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }>
  = {
  PAID:    { label: "Fully Paid",  color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
  PENDING: { label: "Pending",     color: "text-amber-700  dark:text-amber-400",   bg: "bg-amber-50  dark:bg-amber-950/40  border-amber-200  dark:border-amber-800",  icon: Clock        },
  PARTIAL: { label: "Partial",     color: "text-blue-700   dark:text-blue-400",    bg: "bg-blue-50   dark:bg-blue-950/40   border-blue-200   dark:border-blue-800",   icon: Wallet       },
  OVERDUE: { label: "Overdue",     color: "text-red-700    dark:text-red-400",     bg: "bg-red-50    dark:bg-red-950/40    border-red-200    dark:border-red-800",    icon: AlertTriangle },
  WAIVED:  { label: "Waived",      color: "text-gray-600   dark:text-gray-400",    bg: "bg-gray-50   dark:bg-gray-800      border-gray-200   dark:border-gray-700",   icon: CheckCircle2 },
};

const MODE_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque", ONLINE: "Online",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

// ── Fee breakdown row ─────────────────────────────────────────────

function FeeRow({ payment }: { payment: StudentFeePayment }) {
  const cfg  = STATUS_CFG[payment.status] ?? STATUS_CFG["PENDING"]!;
  const Icon = cfg.icon;
  const pct  = payment.amount > 0
    ? Math.round(((payment.paid + payment.waived) / payment.amount) * 100)
    : 100;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0
      border-gray-50 dark:border-gray-700/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">
            {payment.category}
          </p>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
            cfg.bg, cfg.color,
          )}>
            {cfg.label}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              payment.status === "PAID"   || payment.status === "WAIVED" ? "bg-emerald-500" :
              payment.status === "OVERDUE"? "bg-red-500"    :
              payment.status === "PARTIAL"? "bg-blue-500"   :
              "bg-amber-500",
            )}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
            {fmtInr(payment.paid)} / {fmtInr(payment.amount)}
          </p>
          {payment.dueDate && payment.status !== "PAID" && payment.status !== "WAIVED" && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Due {fmtDateShort(payment.dueDate)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN CARD
// ─────────────────────────────────────────────────────────────────

interface Props {
  student: StudentFeeRecord;
  index:   number;
}

export function StudentFeeCard({ student, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const cfg  = STATUS_CFG[student.compositeStatus] ?? STATUS_CFG["PENDING"]!;
  const Icon = cfg.icon;

  const isOverdue = student.compositeStatus === "OVERDUE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay:    Math.min(index, 12) * 0.04,
        duration: 0.35,
        ease:     [0.23, 1, 0.32, 1],
      }}
      className={cn(
        "bg-white dark:bg-gray-800/80 rounded-2xl overflow-hidden",
        "border shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none",
        "transition-shadow hover:shadow-md dark:hover:border-gray-600",
        isOverdue
          ? "border-red-200 dark:border-red-800/50"
          : "border-gray-100 dark:border-gray-700/60",
      )}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className={cn(
        "p-4 pb-0",
        isOverdue && "border-t-2 border-t-red-400 dark:border-t-red-600",
      )}>
        <div className="flex items-start gap-3">

          {/* Avatar */}
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-10 h-10 rounded-xl object-cover shrink-0
                ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center
                text-sm font-black text-white shrink-0 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              {getInitials(student.name)}
            </div>
          )}

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100
              leading-snug truncate">
              {student.name}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {student.sectionLabel}
              {student.rollNumber && (
                <span className="ml-1.5 font-mono">· Roll {student.rollNumber}</span>
              )}
            </p>
          </div>

          {/* Status badge */}
          <span className={cn(
            "flex items-center gap-1 px-2 py-1 text-[10px] font-bold",
            "rounded-full border shrink-0",
            cfg.bg, cfg.color,
          )}>
            <Icon className="w-2.5 h-2.5" aria-hidden />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Fee Progress
          </p>
          <p className={cn(
            "text-[12px] font-extrabold tabular-nums",
            student.paidPct >= 100 ? "text-emerald-600 dark:text-emerald-400" :
            student.paidPct >= 50  ? "text-blue-600 dark:text-blue-400"       :
            isOverdue              ? "text-red-600 dark:text-red-400"          :
            "text-amber-600 dark:text-amber-400",
          )}>
            {student.paidPct}%
          </p>
        </div>

        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${student.paidPct}%` }}
            transition={{ delay: Math.min(index, 12) * 0.04 + 0.2, duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full relative overflow-hidden",
              student.paidPct >= 100 ? "bg-emerald-500" :
              isOverdue              ? "bg-red-500"      :
              student.paidPct >= 50  ? "bg-blue-500"     :
              "bg-amber-500",
            )}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent
              via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500
            uppercase tracking-wide leading-none mb-1">
            Total / Paid
          </p>
          <p className="text-[13px] font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
            {fmtInr(student.collected)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
            of {fmtInr(student.totalFee)}
          </p>
        </div>

        <div className={cn(
          "rounded-xl p-3",
          student.outstanding > 0
            ? isOverdue
              ? "bg-red-50 dark:bg-red-950/30"
              : "bg-amber-50 dark:bg-amber-950/30"
            : "bg-emerald-50 dark:bg-emerald-950/30",
        )}>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500
            uppercase tracking-wide leading-none mb-1">
            Balance
          </p>
          <p className={cn(
            "text-[13px] font-extrabold tabular-nums",
            student.outstanding > 0
              ? isOverdue ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400",
          )}>
            {student.outstanding > 0 ? fmtInr(student.outstanding) : "Nil"}
          </p>
          {student.outstanding === 0 && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
              Fully settled ✓
            </p>
          )}
        </div>
      </div>

      {/* ── Due date + Last payment ─────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-0">
        {student.nextDueDate && student.outstanding > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <CalendarDays className={cn(
              "w-3.5 h-3.5 shrink-0",
              isOverdue ? "text-red-500" : "text-amber-500",
            )} aria-hidden />
            <p className="text-[11px] font-medium truncate">
              <span className="text-gray-400 dark:text-gray-500">Due </span>
              <span className={cn(
                "font-semibold",
                isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300",
              )}>
                {fmtDate(student.nextDueDate)}
              </span>
            </p>
          </div>
        )}

        {student.lastPaymentDate && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
            <p className="text-[11px] font-medium truncate">
              <span className="text-gray-400 dark:text-gray-500">Last </span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">
                {fmtDate(student.lastPaymentDate)}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Actions ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3.5 mt-1
        border-t border-gray-50 dark:border-gray-700/50">
        <Link
          href={`/school-admin/fees/collect/${student.studentProfileId}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5
            py-2 text-[12px] font-bold text-white bg-blue-600
            hover:bg-blue-700 rounded-xl transition-colors"
        >
          <Wallet className="w-3.5 h-3.5" aria-hidden />
          Collect Fee
        </Link>

        
        <a  href={`/api/pdf/fee-receipt?studentProfileId=${student.studentProfileId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Download Receipt"
          aria-label="Download fee receipt"
          className="p-2 text-gray-400 dark:text-gray-500
            hover:text-gray-700 dark:hover:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            rounded-xl transition-colors"
        >
          <FileDown className="w-4 h-4" aria-hidden />
        </a>

        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse fee details" : "Expand fee details"}
          className="p-2 text-gray-400 dark:text-gray-500
            hover:text-gray-700 dark:hover:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            rounded-xl transition-colors"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4" aria-hidden />
            : <ChevronDown className="w-4 h-4" aria-hidden />}
        </button>
      </div>

      {/* ── Expanded fee breakdown ─────────────────────── */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="border-t border-gray-100 dark:border-gray-700/60 px-4 py-3"
        >
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500
            uppercase tracking-wider mb-2">
            Fee Breakdown
          </p>
          {student.payments.map((pay) => (
            <FeeRow key={pay.id} payment={pay} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}