"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
}                              from "recharts";
import {
  ChartShell, ChartTooltip, StatBadge, ChartSkeleton,
}                              from "./chart-shell";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyAdm {
  month: string; count: number; cumulative: number;
}
interface YearlyAdm  { year: string; count: number }
interface ClassAdm   { name: string; students: number }
interface AdmData {
  monthly:  MonthlyAdm[];
  yearly:   YearlyAdm[];
  byClass:  ClassAdm[];
  summary: {
    total: number; thisYear: number; lastYear: number;
    thisMonth: number; yoyGrowthPct: number;
  };
}

const YEAR_COLORS = ["#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9"];

export function AdmissionsCharts() {
  const [data,    setData]    = useState<AdmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/admissions")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load admissions data."); setLoading(false); });
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

  const { summary, monthly, yearly, byClass } = data;
  const growthPositive = summary.yoyGrowthPct >= 0;

  return (
    <div className="space-y-5">

      {/* ── Summary ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="This Month"
          value={summary.thisMonth}
          sub="new admissions"
          color="purple"
        />
        <StatBadge
          label="This Year"
          value={summary.thisYear.toLocaleString("en-IN")}
          sub="total enrollments"
          color="blue"
        />
        <StatBadge
          label="YoY Growth"
          value={`${growthPositive ? "+" : ""}${summary.yoyGrowthPct}%`}
          sub={`vs ${parseInt(new Date().getFullYear().toString()) - 1}`}
          color={growthPositive ? "green" : "red"}
        />
        <StatBadge
          label="Total Students"
          value={summary.total.toLocaleString("en-IN")}
          sub="all time"
          color="gray"
        />
      </div>

      {/* ── YoY badge ─────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${
        growthPositive
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}>
        {growthPositive
          ? <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          : <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />}
        <p className={`text-sm font-semibold ${growthPositive ? "text-emerald-900" : "text-red-800"}`}>
          {growthPositive
            ? `Admissions grew by ${summary.yoyGrowthPct}% compared to last year`
            : `Admissions declined by ${Math.abs(summary.yoyGrowthPct)}% compared to last year`}
          {" "}· {summary.thisYear} this year vs {summary.lastYear} last year
        </p>
      </div>

      {/* ── Monthly admissions (bar + cumulative line) ────── */}
      <ChartShell
        title="Monthly Admissions"
        subtitle="New student enrollments per month"
        csvData={monthly as unknown as Record<string, unknown>[]}
        csvName="admissions-monthly"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ top: 5, right: 10, bottom: 0, left: -12 }} barSize={22}>
            <defs>
              <linearGradient id="cum-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
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
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={24}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip {...props as any} formatter={v => v.toLocaleString("en-IN")} />
              )}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="New Admissions"
              fill="#8b5cf6"
              radius={[5, 5, 0, 0]}
              animationDuration={700}
            >
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: "10px", fill: "#6d28d9", fontWeight: 600 }}
              />
            </Bar>
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke="#ec4899"
              strokeWidth={2}
              fill="url(#cum-grad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* ── Row: Yearly + By class ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Yearly comparison */}
        <ChartShell
          title="Yearly Comparison"
          subtitle="Admissions by year"
          csvData={yearly as unknown as Record<string, unknown>[]}
          csvName="admissions-yearly"
          minHeight={260}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearly} margin={{ top: 5, right: 10, bottom: 0, left: -12 }} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
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
              <Tooltip
                content={(props) => (
                  <ChartTooltip {...props as any} formatter={v => `${v} students`} />
                )}
              />
              <Bar
                dataKey="count"
                name="Students"
                radius={[6, 6, 0, 0]}
                animationDuration={700}
              >
                {yearly.map((_, i) => (
                  <Cell key={i} fill={YEAR_COLORS[i % YEAR_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: "12px", fontWeight: 700, fill: "#7c3aed" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* By class horizontal */}
        <ChartShell
          title="Students by Class"
          subtitle="Current enrollment per class"
          csvData={byClass as unknown as Record<string, unknown>[]}
          csvName="students-by-class"
          minHeight={260}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={byClass.slice(0, 8)}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 0, left: 0 }}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip {...props as any} formatter={v => `${v} students`} />
                )}
              />
              <Bar
                dataKey="students"
                name="Students"
                fill="#8b5cf6"
                radius={[0, 5, 5, 0]}
                animationDuration={700}
              >
                <LabelList
                  dataKey="students"
                  position="right"
                  style={{ fontSize: "11px", fontWeight: 600, fill: "#7c3aed" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}