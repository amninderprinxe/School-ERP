"use client";

import { useMemo, useState }    from "react";
import { motion }               from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
}                               from "recharts";
import { cn }                   from "@/lib/utils";
import type { StudentProfileData } from "./types";
import { ChevronDown, ChevronUp } from "lucide-react";

// ── Tooltip ───────────────────────────────────────────────────────

function ATooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5
      shadow-xl border border-gray-700">
      <p className="font-semibold text-gray-300 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT:  "#10b981",
  ABSENT:   "#ef4444",
  LATE:     "#f59e0b",
  HALF_DAY: "#3b82f6",
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  LATE:     "Late",
  HALF_DAY: "Half Day",
};

// ─────────────────────────────────────────────────────────────────

export function TabAttendance({ data }: { data: StudentProfileData }) {
  const { attendance, profile } = data;
  const [showAll, setShowAll]   = useState(false);

  // ── Monthly data ──────────────────────────────────────────────
  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (11 - i), 1));
      const next  = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1));
      const month = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const recs  = attendance.filter((a) => {
        const ad = new Date(a.date);
        return ad >= d && ad < next;
      });
      const present = recs.filter((a) => a.status === "PRESENT").length;
      const absent  = recs.filter((a) => a.status === "ABSENT" ).length;
      const late    = recs.filter((a) => a.status === "LATE"   ).length;
      const total   = recs.length;
      return {
        month, present, absent, late, total,
        pct: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [attendance]);

  // ── Summary stats ─────────────────────────────────────────────
  const total   = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT" ).length;
  const absent  = attendance.filter((a) => a.status === "ABSENT"  ).length;
  const late    = attendance.filter((a) => a.status === "LATE"    ).length;
  const halfDay = attendance.filter((a) => a.status === "HALF_DAY").length;
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

  // ── Recent records ─────────────────────────────────────────────
  const sorted    = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
  const displayed = showAll ? sorted : sorted.slice(0, 14);

  const STATS = [
    { label: "Present",  value: present, color: "text-emerald-700 bg-emerald-50", bar: "bg-emerald-500" },
    { label: "Absent",   value: absent,  color: "text-red-700 bg-red-50",         bar: "bg-red-500"     },
    { label: "Late",     value: late,    color: "text-amber-700 bg-amber-50",      bar: "bg-amber-500"   },
    { label: "Half Day", value: halfDay, color: "text-blue-700 bg-blue-50",        bar: "bg-blue-500"    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Summary row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overall pct card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "col-span-2 sm:col-span-1 rounded-2xl p-5 flex flex-col",
            "items-center justify-center text-center",
            pct >= 85 ? "bg-emerald-600" : pct >= 75 ? "bg-amber-500" : "bg-red-500",
          )}
        >
          <p className="text-5xl font-black text-white leading-none tabular-nums">
            {total > 0 ? `${pct}%` : "—"}
          </p>
          <p className="text-white/80 text-[12px] font-semibold mt-2">
            Overall Attendance
          </p>
          <p className="text-white/60 text-[11px] mt-1">
            {total} days recorded
          </p>
        </motion.div>

        {/* Status breakdown */}
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: i * 0.06 }}
            className={cn("rounded-2xl p-4 border border-transparent", s.color)}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
              {s.label}
            </p>
            <p className="text-2xl font-extrabold mt-1 leading-none">{s.value}</p>
            <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", s.bar)}
                style={{ width: total > 0 ? `${Math.round((s.value / total) * 100)}%` : "0%" }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Monthly trend chart ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-[14px] font-bold text-gray-900">Monthly Attendance</p>
          <p className="text-[12px] text-gray-400 mt-0.5">Last 12 months</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="att-present-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="att-absent-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<ATooltip />} />
              <Area
                type="monotone"
                dataKey="present"
                name="Present"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#att-present-grad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="Absent"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#att-absent-grad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Attendance % bar ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-[14px] font-bold text-gray-900">Monthly Percentage</p>
          <p className="text-[12px] text-gray-400 mt-0.5">Attendance rate per month</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}%`}
                width={36}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-xl
                      px-3 py-2.5 shadow-xl">
                      <p className="text-gray-300 mb-1">{label}</p>
                      <p className="font-semibold">{payload[0]?.value}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pct" name="%" radius={[4, 4, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Recent records ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-[14px] font-bold text-gray-900">Attendance Records</p>
          <span className="text-[12px] text-gray-400">
            {total} records
          </span>
        </div>

        {total === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {displayed.map((a, i) => {
                const d = new Date(a.date);
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3
                    hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase">
                        {d.toLocaleDateString("en-IN", { month: "short" })}
                      </p>
                      <p className="text-lg font-black text-gray-900 leading-none">
                        {d.getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-700">
                        {d.toLocaleDateString("en-IN", { weekday: "long" })}
                      </p>
                      {a.remarks && (
                        <p className="text-[11px] text-gray-400 truncate">
                          {a.remarks}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0",
                        a.status === "PRESENT"  && "bg-emerald-50 text-emerald-700",
                        a.status === "ABSENT"   && "bg-red-50 text-red-600",
                        a.status === "LATE"     && "bg-amber-50 text-amber-700",
                        a.status === "HALF_DAY" && "bg-blue-50 text-blue-700",
                      )}
                    >
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                );
              })}
            </div>

            {total > 14 && (
              <div className="border-t border-gray-50 p-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((p) => !p)}
                  className="inline-flex items-center gap-1.5 text-[13px]
                    font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showAll ? (
                    <><ChevronUp className="w-4 h-4" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show all {total} records</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}