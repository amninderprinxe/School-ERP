"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
}                              from "recharts";
import {
  ChartShell, ChartTooltip, StatBadge, ChartSkeleton,
}                              from "./chart-shell";
import { fmtCurrency }         from "@/lib/fee-utils";

// ── Types ─────────────────────────────────────────────────────────

interface MonthlyRevenue   { month: string; collected: number; waived: number }
interface CategoryData     { category: string; collected: number; outstanding: number; total: number }
interface StatusData       { status: string; count: number; amount: number }
interface ModeData         { mode: string; amount: number; count: number }

interface FinanceData {
  monthly:     MonthlyRevenue[];
  byCategory:  CategoryData[];
  byStatus:    StatusData[];
  byMode:      ModeData[];
  summary:     {
    totalCollected:      number;
    totalOutstanding:    number;
    thisMonthCollected:  number;
    pendingCount:        number;
  };
}

// ─────────────────────────────────────────────────────────────────

const PIE_PALETTE = ["#10b981","#6366f1","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];
const BAR_PALETTE = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#818cf8","#4f46e5","#4338ca","#3730a3"];

const STATUS_COLORS: Record<string, string> = {
  PAID:    "#10b981",
  PARTIAL: "#6366f1",
  PENDING: "#f59e0b",
  WAIVED:  "#94a3b8",
};

export function FinanceCharts() {
  const [data,    setData]    = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/finance")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load finance data."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <ChartSkeleton height={280} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-red-600 font-medium">{error ?? "No data"}</p>
      </div>
    );
  }

  const { summary, monthly, byCategory, byStatus, byMode } = data;

  return (
    <div className="space-y-5">

      {/* ── Summary ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="Total Collected"
          value={fmtCurrency(summary.totalCollected)}
          sub="all time"
          color="green"
        />
        <StatBadge
          label="Total Outstanding"
          value={fmtCurrency(summary.totalOutstanding)}
          sub="pending dues"
          color={summary.totalOutstanding > 0 ? "amber" : "green"}
        />
        <StatBadge
          label="This Month"
          value={fmtCurrency(summary.thisMonthCollected)}
          sub="collected"
          color="blue"
        />
        <StatBadge
          label="Pending Payments"
          value={summary.pendingCount}
          sub="incomplete fees"
          color="red"
        />
      </div>

      {/* ── Monthly revenue trend ─────────────────────────── */}
      <ChartShell
        title="Revenue Trend"
        subtitle="Monthly fee collection — last 12 months"
        csvData={monthly as unknown as Record<string, unknown>[]}
        csvName="revenue-monthly"
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthly} margin={{ top: 5, right: 10, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
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
              tickFormatter={v => fmtCurrency(v)}
              width={64}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  formatter={v => fmtCurrency(v)}
                />
              )}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Area
              type="monotone"
              dataKey="collected"
              name="Collected"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#rev-grad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Bar
              dataKey="waived"
              name="Waived"
              fill="#94a3b8"
              radius={[3, 3, 0, 0]}
              barSize={6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* ── Row: Category + Status ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* By category */}
        <ChartShell
          title="Fee Collection by Category"
          subtitle="Collected vs outstanding per category"
          csvData={byCategory as unknown as Record<string, unknown>[]}
          csvName="fees-by-category"
          minHeight={280}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byCategory}
              layout="vertical"
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
              barSize={10}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => fmtCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    {...props as any}
                    formatter={v => fmtCurrency(v)}
                  />
                )}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Bar dataKey="collected"   name="Collected"   fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* By status pie */}
        <ChartShell
          title="Outstanding Dues"
          subtitle="Fee payments by status"
          csvData={byStatus as unknown as Record<string, unknown>[]}
          csvName="fees-by-status"
          minHeight={280}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 h-[260px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byStatus.filter(s => s.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  dataKey="amount"
                  nameKey="status"
                  paddingAngle={3}
                >
                  {byStatus.map((s, i) => (
                    <Cell
                      key={s.status}
                      fill={STATUS_COLORS[s.status] ?? PIE_PALETTE[i % PIE_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      {...props as any}
                      formatter={v => fmtCurrency(v)}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-col gap-2 shrink-0 pr-2">
              {byStatus.filter(s => s.count > 0).map((s, i) => (
                <div key={s.status} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: STATUS_COLORS[s.status] ?? PIE_PALETTE[i] }}
                  />
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800 leading-none capitalize">
                      {s.status.toLowerCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {s.count} · {fmtCurrency(s.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartShell>
      </div>

      {/* ── Payment mode chart ────────────────────────────── */}
      <ChartShell
        title="Payment Mode Distribution"
        subtitle="Amount collected by payment method"
        csvData={byMode as unknown as Record<string, unknown>[]}
        csvName="payment-modes"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byMode} margin={{ top: 5, right: 10, bottom: 0, left: -8 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="mode"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => fmtCurrency(v)}
              width={64}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  formatter={(v, key) =>
                    key === "amount" ? fmtCurrency(v) : `${v} payments`
                  }
                />
              )}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Bar dataKey="amount" name="Amount" fill="#6366f1" radius={[5, 5, 0, 0]}>
              {byMode.map((_, i) => (
                <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}