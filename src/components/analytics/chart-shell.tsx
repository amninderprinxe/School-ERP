"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion }                            from "framer-motion";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { cn }                                from "@/lib/utils";

// ── CSV export helper ─────────────────────────────────────────────
export function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]!).join(",");
  const rows    = data.map(row =>
    Object.values(row)
      .map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );
  const blob = new Blob([[headers, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────
// CHART SHELL
// ─────────────────────────────────────────────────────────────────

export interface ChartShellProps {
  title:       string;
  subtitle?:   string;
  csvData?:    Record<string, unknown>[];
  csvName?:    string;
  actions?:    ReactNode;
  children:    ReactNode;
  className?:  string;
  minHeight?:  number;
}

export function ChartShell({
  title, subtitle, csvData, csvName, actions, children, className, minHeight = 320,
}: ChartShellProps) {
  const ref        = useRef<HTMLDivElement>(null);
  const [pngBusy, setPngBusy] = useState(false);

  const handlePng = async () => {
    if (!ref.current || pngBusy) return;
    setPngBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(ref.current, {
        cacheBust:       true,
        backgroundColor: "#ffffff",
        pixelRatio:      2,
      });
      const a    = document.createElement("a");
      a.download = `${csvName ?? title}-chart.png`;
      a.href     = url;
      a.click();
    } catch (e) {
      console.error("[ChartShell] PNG export failed:", e);
    } finally {
      setPngBusy(false);
    }
  };

  const handleCsv = () => {
    if (csvData?.length) downloadCsv(csvData, csvName ?? title);
  };

  const btnBase = cn(
    "p-1.5 rounded-lg border text-gray-500 transition-all duration-150",
    "hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "border-gray-200",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "bg-white rounded-2xl border border-gray-100",
        "shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden",
        className,
      )}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-[15px] font-semibold text-gray-900 leading-snug">
            {title}
          </p>
          {subtitle && (
            <p className="text-[12px] text-gray-400 mt-0.5 leading-none">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-4">
          {actions}
          <button
            type="button"
            onClick={handlePng}
            disabled={pngBusy}
            title="Export as PNG"
            aria-label="Export chart as PNG"
            className={btnBase}
          >
            {pngBusy
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              : <FileImage className="w-4 h-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={handleCsv}
            disabled={!csvData?.length}
            title="Export as CSV"
            aria-label="Export data as CSV"
            className={btnBase}
          >
            <FileText className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Chart body ───────────────────────────────────── */}
      <div ref={ref} className="p-4" style={{ minHeight }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── Shared tooltip ────────────────────────────────────────────────

export function ChartTooltip({
  active, payload, label, formatter,
}: {
  active?:    boolean;
  payload?:   { name: string; value: number; color: string; dataKey: string }[];
  label?:     string;
  formatter?: (v: number, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3.5 py-3
      shadow-2xl border border-gray-700 min-w-[130px]">
      {label && (
        <p className="font-semibold text-gray-300 mb-2 leading-none">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold text-white">
              {formatter ? formatter(p.value, p.dataKey) : p.value.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section stat card ─────────────────────────────────────────────

export function StatBadge({
  label, value, sub, color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "gray";
}) {
  const C = {
    blue:   { bg: "bg-blue-50",    text: "text-blue-700",   val: "text-blue-900"   },
    green:  { bg: "bg-emerald-50", text: "text-emerald-700",val: "text-emerald-900" },
    red:    { bg: "bg-red-50",     text: "text-red-700",    val: "text-red-900"    },
    amber:  { bg: "bg-amber-50",   text: "text-amber-700",  val: "text-amber-900"  },
    purple: { bg: "bg-purple-50",  text: "text-purple-700", val: "text-purple-900" },
    gray:   { bg: "bg-gray-50",    text: "text-gray-500",   val: "text-gray-900"   },
  }[color];

  return (
    <div className={cn("rounded-xl px-4 py-3.5 border border-transparent", C.bg)}>
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider leading-none", C.text)}>
        {label}
      </p>
      <p className={cn("text-2xl font-extrabold mt-1.5 leading-none tabular-nums", C.val)}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 mt-1 leading-none">{sub}</p>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex items-end gap-2 h-full pb-8">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-100 rounded-t-md"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Period selector ───────────────────────────────────────────────

export function PeriodSelector({
  value, onChange, options,
}: {
  value:    string;
  onChange: (v: string) => void;
  options:  { label: string; value: string }[];
}) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-150",
            value === opt.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}