"use client";

import { useRef }          from "react";
import { motion, useInView } from "framer-motion";
import {
  Wallet, TrendingUp, AlertCircle,
  Clock, CheckCircle2, ArrowUpRight,
}                          from "lucide-react";
import { cn }              from "@/lib/utils";
import type { FeeKpis }    from "./types";

// ── Format helper ─────────────────────────────────────────────────

export function fmtInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Count-up hook ─────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const ref    = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });

  if (typeof window !== "undefined" && ref.current && inView) {
    const start    = Date.now();
    const startVal = 0;
    const tick = () => {
      const p     = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (ref.current) {
        ref.current.textContent = fmtInr(Math.round(eased * target));
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return ref;
}

// ── KPI card ──────────────────────────────────────────────────────

interface CardProps {
  title:     string;
  value:     number;
  sub?:      string;
  icon:      React.ComponentType<{ className?: string }>;
  gradient:  string;
  text:      string;
  badge?:    string;
  badgeColor?: string;
  delay:     number;
  isMoney:   boolean;
}

function KpiCard({
  title, value, sub, icon: Icon, gradient, text, badge, badgeColor, delay, isMoney,
}: CardProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 20 } }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5",
        gradient,
        "cursor-default",
      )}
    >
      {/* Background decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full
        bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full
        bg-white/5 pointer-events-none" />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className={cn("w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center", text)}>
            <Icon className="w-5 h-5 text-white" aria-hidden />
          </div>
          {badge && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              badgeColor,
            )}>
              {badge}
            </span>
          )}
        </div>

        <div>
          <p className="text-[28px] font-extrabold text-white leading-none tabular-nums">
            {isMoney ? fmtInr(value) : value.toLocaleString("en-IN")}
          </p>
          <p className="text-[12px] font-semibold text-white/75 mt-1.5 leading-none">
            {title}
          </p>
          {sub && (
            <p className="text-[11px] text-white/55 mt-1 leading-none">{sub}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────

export function FeeKpiStrip({ kpis }: { kpis: FeeKpis }) {
  const cards: CardProps[] = [
    {
      title:    "Total Fees",
      value:    kpis.totalFee,
      sub:      `${kpis.collectionRate}% collection rate`,
      icon:     Wallet,
      gradient: "bg-gradient-to-br from-blue-600 to-blue-700",
      text:     "text-blue-200",
      isMoney:  true,
      delay:    0,
    },
    {
      title:    "Collected",
      value:    kpis.collected,
      sub:      `${kpis.collectionRate}% of total`,
      icon:     CheckCircle2,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      text:     "text-emerald-200",
      badge:    `${kpis.collectionRate}%`,
      badgeColor: "bg-white/20 text-white",
      isMoney:  true,
      delay:    0.06,
    },
    {
      title:    "Pending",
      value:    kpis.outstanding,
      sub:      `from ${kpis.students?.length ?? 0} students`,
      icon:     Clock,
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      text:     "text-amber-200",
      isMoney:  true,
      delay:    0.12,
    },
    {
      title:    "Overdue",
      value:    kpis.overdue,
      sub:      "past due date",
      icon:     AlertCircle,
      gradient: kpis.overdue > 0
        ? "bg-gradient-to-br from-red-500 to-red-700"
        : "bg-gradient-to-br from-gray-500 to-gray-600",
      text:     "text-red-200",
      badge:    kpis.overdue > 0 ? "Action needed" : undefined,
      badgeColor: "bg-red-300/30 text-red-100",
      isMoney:  true,
      delay:    0.18,
    },
    {
      title:    "Today's Collection",
      value:    kpis.todayCollection,
      sub:      `${kpis.todayCount} payment${kpis.todayCount !== 1 ? "s" : ""} today`,
      icon:     TrendingUp,
      gradient: "bg-gradient-to-br from-violet-600 to-purple-700",
      text:     "text-violet-200",
      isMoney:  true,
      delay:    0.24,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}