"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
}                              from "recharts";
import {
  ChartShell, ChartTooltip, StatBadge,
  ChartSkeleton, PeriodSelector,
}                              from "./chart-shell";
import { cn }                  from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

interface DailyPoint {
  date: string; rawDate: string;
  present: number; absent: number;
  late: number; halfDay: number;
  total: number; pct: number;
}

interface WeeklyPoint {
  week:    string;
  present: number;
  absent:  number;
  total:   number;
  pct:     number;
}

interface MonthlyPoint {
  month:   string;
  present: number;
  absent:  number;
  late:    number;
  total:   number;
  pct:     number;
}

interface AttendanceData {
  daily:   DailyPoint[];
  weekly:  WeeklyPoint[];
  monthly: MonthlyPoint[];
  summary: {
    totalStudents: number;
    todayPresent:  number;
    todayAbsent:   number;
    todayTotal:    number;
    todayPct:      number;
    avgMonthlyPct: number;
  };
}

// ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "Daily",   value: "daily"   },
  { label: "Weekly",  value: "weekly"  },
  { label: "Monthly", value: "monthly" },
];

// Custom gradient defs id
const GRAD_ID = "att-gradient";

export function AttendanceCharts() {
  const [data,    setData]    = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [period,  setPeriod]  = useState("daily");

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics/attendance?days=30")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load attendance data."); setLoading(false); });
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

  const { summary, daily, weekly, monthly } = data;
  const chartData  = period === "daily" ? daily : period === "weekly" ? weekly : monthly;
  const xKey       = period === "daily" ? "date" : period === "weekly" ? "week" : "month";
  const pctLabel   = "Attendance %";
  const csvData    = chartData as unknown as Record<string, unknown>[];
  const avgLine    = period === "monthly"
    ? Math.round(monthly.reduce((s, m) => s + m.pct, 0) / (monthly.filter(m => m.total > 0).length || 1))
    : null;

  return (
    <div className="space-y-5">

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="Today's Attendance"
          value={`${summary.todayPct}%`}
          sub={`${summary.todayPresent} present`}
          color={summary.todayPct >= 85 ? "green" : summary.todayPct >= 70 ? "amber" : "red"}
        />
        <StatBadge
          label="Absent Today"
          value={summary.todayAbsent}
          sub="students absent"
          color="red"
        />
        <StatBadge
          label="Monthly Avg"
          value={`${summary.avgMonthlyPct}%`}
          sub="last 12 months"
          color="blue"
        />
        <StatBadge
          label="Total Students"
          value={summary.totalStudents.toLocaleString("en-IN")}
          sub="active"
          color="gray"
        />
      </div>

      {/* ── Area chart ────────────────────────────────────── */}
      <ChartShell
        title="Attendance Trend"
        subtitle={`${period === "daily" ? "Last 30 days" : period === "weekly" ? "Last 12 weeks" : "Last 12 months"}`}
        csvData={csvData}
        csvName={`attendance-${period}`}
        actions={
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            options={PERIODS}
          />
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData as any} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <defs>
              <linearGradient id="grad-present" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="grad-absent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  formatter={(v, key) =>
                    key === "pct" ? `${v}%` : v.toLocaleString("en-IN")
                  }
                />
              )}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            {avgLine !== null && (
              <ReferenceLine
                y={avgLine}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{ value: `Avg ${avgLine}%`, position: "right", fontSize: 11, fill: "#6366f1" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="present"
              name="Present"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#grad-present)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="absent"
              name="Absent"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#grad-absent)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* ── Attendance % bar chart ────────────────────────── */}
      <ChartShell
        title="Attendance Percentage"
        subtitle="Percentage of students present"
        csvData={csvData}
        csvName={`attendance-pct-${period}`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData as any}
            margin={{ top: 5, right: 10, bottom: 0, left: -15 }}
            barSize={period === "daily" ? 8 : 18}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={period === "daily" ? 6 : "preserveStartEnd"}
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
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  formatter={(v) => `${v}%`}
                />
              )}
            />
            <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4"
              label={{ value: "75% min", position: "right", fontSize: 11, fill: "#f59e0b" }}
            />
            <Bar
              dataKey="pct"
              name="Attendance %"
              radius={[3, 3, 0, 0]}
              fill="#10b981"
              animationDuration={700}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}