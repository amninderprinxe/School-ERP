"use client";

import { useState }          from "react";
import { motion }            from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
}                            from "recharts";
import { cn }                from "@/lib/utils";
import { fmtInr }            from "./fee-kpi-strip";
import type {
  MonthlyTrend, ModeData,
}                            from "./types";

// ── Shared tooltip ─────────────────────────────────────────────────

function FeeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl
      px-3.5 py-3 shadow-2xl border border-gray-700 min-w-[140px]">
      {label && (
        <p className="text-[11px] font-semibold text-gray-400 mb-2">{label}</p>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-[12px] font-bold text-white">
            {fmtInr(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Mode label map ─────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank",
  CHEQUE:        "Cheque",
  ONLINE:        "Online",
};

const MODE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];
const PIE_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

// ─────────────────────────────────────────────────────────────────

interface Props {
  trend:  MonthlyTrend[];
  byMode: ModeData[];
}

type ChartView = "area" | "bar";

export function CollectionCharts({ trend, byMode }: Props) {
  const [view, setView] = useState<ChartView>("area");

  const totalByMode = byMode.reduce((s, m) => s + m.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* ── Trend chart (2/3 width) ────────────────────── */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800/80 rounded-2xl
        border border-gray-100 dark:border-gray-700/60
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4
          border-b border-gray-100 dark:border-gray-700/60">
          <div>
            <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
              Collection Trend
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
              Monthly collection vs pending — last 12 months
            </p>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-0.5">
            {(["area", "bar"] as ChartView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-semibold rounded-lg",
                  "transition-all duration-150 capitalize",
                  view === v
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={240}>
            {view === "area" ? (
              <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="fee-collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="fee-pending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
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
                  tickFormatter={fmtInr}
                  width={58}
                />
                <Tooltip content={<FeeTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#fee-collected)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#fee-pending)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -8 }} barSize={14} barGap={3}>
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
                  tickFormatter={fmtInr}
                  width={58}
                />
                <Tooltip content={<FeeTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending"   name="Pending"   fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Payment mode (1/3 width) ───────────────────── */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl
        border border-gray-100 dark:border-gray-700/60
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
            Payment Modes
          </p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
            How fees were paid
          </p>
        </div>

        <div className="p-4">
          {byMode.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-gray-400">No payment data</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={byMode}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="amount"
                    nameKey="mode"
                    paddingAngle={3}
                  >
                    {byMode.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-2xl">
                          <p className="font-semibold">{MODE_LABELS[payload[0]?.payload?.mode] ?? payload[0]?.payload?.mode}</p>
                          <p>{fmtInr(payload[0]?.value as number)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {byMode.map((m, i) => {
                  const pct = totalByMode > 0 ? Math.round((m.amount / totalByMode) * 100) : 0;
                  return (
                    <div key={m.mode} className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                      />
                      <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300 flex-1">
                        {MODE_LABELS[m.mode] ?? m.mode}
                      </span>
                      <span className="text-[11px] text-gray-400">{pct}%</span>
                      <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                        {fmtInr(m.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}