"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView }           from "framer-motion";
// Recharts may not be available in some build environments. Attempt runtime require
// and fall back to lightweight stubs to avoid module-not-found compile errors.
let AreaChart: any, Area: any, ResponsiveContainer: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore
  const recharts = require("recharts");
  AreaChart = recharts.AreaChart;
  Area = recharts.Area;
  ResponsiveContainer = recharts.ResponsiveContainer;
} catch (e) {
  // Lightweight fallback components
  // ResponsiveContainer renders children into a div with given height
  ResponsiveContainer = ({ children, height }: any) => (
    <div style={{ width: "100%", height }}>{children}</div>
  );
  AreaChart = ({ children }: any) => <svg style={{ width: "100%", height: "100%" }}>{children}</svg>;
  Area = () => null;
}
import {
  ArrowUpRight, ArrowDownRight, Minus,
}                                      from "lucide-react";
import type { LucideIcon }             from "lucide-react";

// ── Color tokens ──────────────────────────────────────────────────

const THEMES = {
  blue:    { icon: "text-blue-600",    bg: "bg-blue-50",    stroke: "#3b82f6", ring: "ring-blue-100"    },
  violet:  { icon: "text-violet-600",  bg: "bg-violet-50",  stroke: "#7c3aed", ring: "ring-violet-100"  },
  rose:    { icon: "text-rose-500",    bg: "bg-rose-50",    stroke: "#f43f5e", ring: "ring-rose-100"    },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50", stroke: "#10b981", ring: "ring-emerald-100" },
  amber:   { icon: "text-amber-600",   bg: "bg-amber-50",   stroke: "#f59e0b", ring: "ring-amber-100"   },
  sky:     { icon: "text-sky-600",     bg: "bg-sky-50",     stroke: "#0ea5e9", ring: "ring-sky-100"     },
  indigo:  { icon: "text-indigo-600",  bg: "bg-indigo-50",  stroke: "#6366f1", ring: "ring-indigo-100"  },
  teal:    { icon: "text-teal-600",    bg: "bg-teal-50",    stroke: "#14b8a6", ring: "ring-teal-100"    },
} as const;

export type KpiColor = keyof typeof THEMES;
export type KpiFormat = "number" | "currency" | "percent";

// ── Format helpers ────────────────────────────────────────────────

export function formatKpiValue(v: number, fmt: KpiFormat): string {
  if (fmt === "percent")  return `${v.toFixed(1)}%`;
  if (fmt === "currency") {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${v.toLocaleString("en-IN")}`;
  }
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-IN");
}

// ── Animated counter hook ─────────────────────────────────────────

function useCountUp(target: number, duration = 1_100) {
  const [count, setCount] = useState(0);
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    if (target === 0) { setCount(0); return; }
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);        // ease-out cubic
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { count, ref };
}

// ── Component ─────────────────────────────────────────────────────

export interface KpiCardProps {
  title:       string;
  value:       number;
  lastMonth:   number;
  sparkline:   number[];
  icon:        LucideIcon;
  color:       KpiColor;
  format:      KpiFormat;
  index:       number;
  invertTrend?: boolean;   // true = lower is better (e.g. pending fees)
  suffix?:     string;
}

export function KpiCard({
  title, value, lastMonth, sparkline,
  icon: Icon, color, format, index, invertTrend = false,
}: KpiCardProps) {
  const { count, ref } = useCountUp(value);
  const th = THEMES[color];

  // ── Change calculation ────────────────────────────────────────
  const raw        = lastMonth === 0
    ? (value > 0 ? 100 : 0)
    : ((value - lastMonth) / Math.max(lastMonth, 1)) * 100;
  const changePct  = Math.abs(raw);
  const improved   = invertTrend ? raw < 0 : raw > 0;
  const neutral    = raw === 0;

  const badgeClass = neutral
    ? "bg-gray-100 text-gray-500"
    : improved
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-red-50 text-red-600 ring-1 ring-red-200";

  const sparkData = sparkline.map((v, i) => ({ i, v }));
  const sparkId   = `spark-${title.replace(/\W/g, "")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay:    index * 0.06,
        ease:     [0.23, 1, 0.32, 1],
      }}
      whileHover={{
        y: -3,
        boxShadow: "0 12px 32px -4px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)",
        transition: { type: "spring", stiffness: 350, damping: 22 },
      }}
      className="group relative bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 overflow-hidden cursor-default"
    >
      {/* Gradient wash on hover */}
      <div
        className={`absolute inset-0 ${th.bg} opacity-0
          group-hover:opacity-40 transition-opacity duration-300
          pointer-events-none`}
      />

      <div className="relative flex flex-col gap-4">

        {/* ── Top row ─────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className={`${th.bg} p-2.5 rounded-xl ring-1 ${th.ring}`}>
            <Icon className={`w-[18px] h-[18px] ${th.icon}`} />
          </div>

          <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full
            text-[11px] font-semibold leading-none ${badgeClass}`}>
            {neutral ? (
              <Minus className="w-2.5 h-2.5 mr-0.5" />
            ) : improved ? (
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
            )}
            {changePct.toFixed(1)}%
          </div>
        </div>

        {/* ── Value ────────────────────────────────── */}
        <div ref={ref}>
          <p className="text-[28px] font-extrabold text-gray-900
            tracking-tight leading-none tabular-nums">
            {formatKpiValue(count, format)}
          </p>
          <p className="text-[13px] font-medium text-gray-500 mt-1.5 leading-none">
            {title}
          </p>
        </div>

        {/* ── Sparkline ────────────────────────────── */}
        <div className="-mx-1 -mb-1">
          <ResponsiveContainer width="100%" height={44}>
            <AreaChart
              data={sparkData}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={th.stroke} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={th.stroke} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={th.stroke}
                strokeWidth={1.5}
                fill={`url(#${sparkId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Comparison footnote ───────────────────── */}
        <p className="text-[11px] text-gray-400 -mt-2 tabular-nums">
          <span className={improved ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
            {formatKpiValue(lastMonth, format)}
          </span>
          {" "}last month
        </p>
      </div>
    </motion.div>
  );
}