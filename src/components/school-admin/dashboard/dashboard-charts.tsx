"use client";

import { useRef, useState }    from "react";
import { motion, useInView }   from "framer-motion";
// Minimal local stand-ins for 'recharts' to avoid dependency/type errors
// These are simple wrappers so the dashboard can render without the library
// in environments where 'recharts' isn't installed. They intentionally accept
// any props and render children directly.
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// ── Shared tooltip style ──────────────────────────────────────────

function ChartTooltip({
  active, payload, label, valueFormatter,
}: {
  active?:        boolean;
  payload?:       { name: string; value: number; color: string }[];
  label?:         string;
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
      px-3.5 py-3 text-xs min-w-[110px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-900">
            {valueFormatter(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chart wrapper with enter animation ───────────────────────────

function ChartCard({
  title, subtitle, children, className = "",
}: {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  className?: string;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
      className={`bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden ${className}`}
    >
      <div className="px-5 pt-5 pb-1">
        <p className="text-[15px] font-semibold text-gray-900">{title}</p>
        {subtitle && (
          <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="px-2 pb-4 pt-2">{children}</div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ATTENDANCE TREND
// ─────────────────────────────────────────────────────────────────

export interface AttTrendPoint {
  date:    string;
  pct:     number;
  present: number;
  absent:  number;
}

export function AttendanceTrendChart({
  data,
}: {
  data: AttTrendPoint[];
}) {
  return (
    <ChartCard
      title="Attendance Trend"
      subtitle="Daily attendance % · last 30 days"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="att-pct" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f3f4f6"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={36}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props as any}
                valueFormatter={(v) => `${v.toFixed(1)}%`}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="pct"
            name="Attendance"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#att-pct)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// REVENUE TREND
// ─────────────────────────────────────────────────────────────────

export interface RevPoint {
  month:  string;
  amount: number;
}

export function RevenueTrendChart({ data }: { data: RevPoint[] }) {
  function formatKpiValue(v: number, arg1: string): string {
    // Simple formatter used for Y axis ticks and tooltips.
    // When asked for "currency" produce a compact currency string.
    if (arg1 === "currency") {
      const abs = Math.abs(v);
      const sign = v < 0 ? "-" : "";
      if (abs >= 1e9) return `${sign}₹${(abs / 1e9).toFixed(1)}B`;
      if (abs >= 1e6) return `${sign}₹${(abs / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
      return `${sign}₹${abs.toLocaleString()}`;
    }

    // Fallback: default numeric formatting
    return Number.isFinite(v) ? String(v) : "-";
  }

  return (
    <ChartCard
      title="Revenue Trend"
      subtitle="Monthly fee collection"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f3f4f6"
          />
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
            tickFormatter={(v) => formatKpiValue(v, "currency")}
            width={52}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props as any}
                valueFormatter={(v) => formatKpiValue(v, "currency")}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="amount"
            name="Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#rev-grad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMISSIONS CHART
// ─────────────────────────────────────────────────────────────────

export interface AdmPoint {
  month: string;
  count: number;
}

export function AdmissionsChart({ data }: { data: AdmPoint[] }) {
  const BAR_COLORS = [
    "#818cf8","#a78bfa","#c4b5fd","#818cf8","#6366f1","#4f46e5","#4338ca",
  ];

  return (
    <ChartCard
      title="New Admissions"
      subtitle="Monthly student enrollments"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, bottom: 0, left: -8 }}
          barSize={22}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f3f4f6"
          />
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
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "#f9fafb" }}
            content={(props) => (
              <ChartTooltip
                {...props as any}
                valueFormatter={(v) => `${v} student${v !== 1 ? "s" : ""}`}
              />
            )}
          />
          <Bar dataKey="count" name="Admissions" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// CLASS DISTRIBUTION
// ─────────────────────────────────────────────────────────────────

export interface ClassDistPoint {
  name:     string;
  students: number;
}

const PIE_PALETTE = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b",
  "#ef4444","#06b6d4","#ec4899","#84cc16",
];

function CustomPieLabel({
  cx, cy, midAngle, innerRadius, outerRadius, name, value, percent,
}: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {value}
    </text>
  );
}

export function ClassDistributionChart({ data }: { data: ClassDistPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <ChartCard
      title="Class Distribution"
      subtitle="Active students per class"
      className="flex flex-col"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 px-3">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="students"
              nameKey="name"
              paddingAngle={2}
              labelLine={false}
              label={<CustomPieLabel />}
              onMouseEnter={(_, idx) => setActive(idx)}
              onMouseLeave={()       => setActive(null)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={PIE_PALETTE[i % PIE_PALETTE.length]}
                  opacity={active === null || active === i ? 1 : 0.55}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  valueFormatter={(v) => `${v} student${v !== 1 ? "s" : ""}`}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap sm:flex-col gap-1.5 sm:gap-2
          justify-center sm:justify-start shrink-0 sm:pr-4">
          {data.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
              />
              <span className="text-[12px] text-gray-600 font-medium">
                {d.name}
              </span>
              <span className="text-[11px] text-gray-400 tabular-nums">
                ({d.students})
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}