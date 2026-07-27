"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link                        from "next/link";
import {
  GraduationCap, UserCheck, Users,
  CalendarCheck, Wallet, TrendingUp,
  BookOpen, Award, CalendarOff,
  Plus, ClipboardList, ChevronRight,
  Sparkles, Bell,
}                                  from "lucide-react";
import { KpiCard }                 from "./kpi-card";
import type { KpiColor, KpiFormat } from "./kpi-card";
import {
  AttendanceTrendChart,
  RevenueTrendChart,
  AdmissionsChart,
  ClassDistributionChart,
}                                  from "./dashboard-charts";
import type {
  AttTrendPoint,
  RevPoint,
  AdmPoint,
  ClassDistPoint,
}                                  from "./dashboard-charts";

// ── Type ──────────────────────────────────────────────────────────

export interface DashboardData {
  meta: {
    userName:       string;
    schoolName:     string;
    currentYear:    string | null;
    holidayToday:   { name: string; type: string } | null;
  };
  kpis: {
    students:       { value: number; lastMonth: number; sparkline: number[] };
    teachers:       { value: number; lastMonth: number; sparkline: number[] };
    parents:        { value: number; lastMonth: number; sparkline: number[] };
    attendance:     { value: number; lastMonth: number; sparkline: number[]; present: number; absent: number; total: number };
    pendingFees:    { value: number; lastMonth: number; sparkline: number[]; amount: number };
    revenue:        { value: number; lastMonth: number; sparkline: number[] };
    newAdmissions:  { value: number; lastMonth: number; sparkline: number[] };
    activeClasses:  { value: number; lastMonth: number; sparkline: number[] };
  };
  charts: {
    attendanceTrend:   AttTrendPoint[];
    revenueTrend:      RevPoint[];
    admissionsChart:   AdmPoint[];
    classDistribution: ClassDistPoint[];
  };
}

// ── KPI card config ───────────────────────────────────────────────

interface KpiConfig {
  key:         keyof DashboardData["kpis"];
  title:       string;
  icon:        React.ComponentType<{ className?: string }>;
  color:       KpiColor;
  format:      KpiFormat;
  invertTrend?: boolean;
}

const KPI_CONFIG: KpiConfig[] = [
  { key: "students",      title: "Total Students",    icon: GraduationCap, color: "blue",    format: "number"   },
  { key: "teachers",      title: "Total Teachers",    icon: UserCheck,     color: "violet",  format: "number"   },
  { key: "parents",       title: "Total Parents",     icon: Users,         color: "rose",    format: "number"   },
  { key: "attendance",    title: "Today's Attendance",icon: CalendarCheck, color: "emerald", format: "percent"  },
  { key: "pendingFees",   title: "Pending Fees",      icon: Wallet,        color: "amber",   format: "number", invertTrend: true },
  { key: "revenue",       title: "Monthly Revenue",   icon: TrendingUp,    color: "sky",     format: "currency" },
  { key: "newAdmissions", title: "New Admissions",    icon: Award,         color: "indigo",  format: "number"   },
  { key: "activeClasses", title: "Active Classes",    icon: BookOpen,      color: "teal",    format: "number"   },
];

// ── Greeting ──────────────────────────────────────────────────────

function getGreeting(name: string | null) {
  const h  = new Date().getHours();
  const t  = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const fn = name?.split(" ")[0] ?? null;
  return { time: t, name: fn };
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function SchoolAdminDashboard({ data }: { data: DashboardData }) {
  const { meta, kpis, charts } = data;
  const { time, name }         = getGreeting(meta.userName);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-8 pb-8">

      {/* ═══════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════ */}
      <div className="space-y-6">

        {/* Greeting + meta */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-wrap items-start justify-between gap-5"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[28px] leading-none" aria-hidden>
                {time === "morning" ? "🌤️" : time === "afternoon" ? "☀️" : "🌙"}
              </span>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Good {time}{name ? `, ${name}` : ""}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-sm text-gray-400">{today}</p>
              {meta.currentYear && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5
                  text-[11px] font-semibold bg-indigo-50 text-indigo-700
                  border border-indigo-200 rounded-full">
                  📅 {meta.currentYear}
                </span>
              )}
              {meta.schoolName && (
                <span className="text-[11px] text-gray-400 font-medium">
                  · {meta.schoolName}
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/school-admin/students/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                font-semibold text-white bg-blue-600 hover:bg-blue-700
                rounded-xl shadow-[0_1px_4px_rgba(59,130,246,0.3)]
                hover:shadow-[0_3px_12px_rgba(59,130,246,0.35)]
                transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Student
            </Link>
            <Link
              href="/school-admin/exams/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                font-semibold text-gray-700 bg-white border border-gray-200
                hover:border-gray-300 hover:bg-gray-50 rounded-xl
                shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                transition-all duration-200"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              New Exam
            </Link>
            <Link
              href="/school-admin/fees/collect"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                font-semibold text-gray-700 bg-white border border-gray-200
                hover:border-gray-300 hover:bg-gray-50 rounded-xl
                shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                transition-all duration-200"
            >
              <Wallet className="w-3.5 h-3.5" />
              Collect Fee
            </Link>
          </div>
        </motion.div>

        {/* Holiday banner */}
        <AnimatePresence>
          {meta.holidayToday && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 px-5 py-3.5 bg-amber-50
                border border-amber-200 rounded-2xl overflow-hidden"
            >
              <CalendarOff className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-amber-900">
                Today is a holiday:
                <span className="text-amber-700 ml-1.5">
                  {meta.holidayToday.name}
                </span>
              </p>
              <span className="ml-auto text-[11px] font-semibold
                text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {meta.holidayToday.type.replace("_", " ")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attendance quick-status banner */}
        {kpis.attendance.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 px-5 py-3.5 bg-white border
              border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[13px] font-semibold text-gray-800">
                Today's Attendance
              </p>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500 font-medium">
                  {kpis.attendance.present} Present
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-gray-500 font-medium">
                  {kpis.attendance.absent} Absent
                </span>
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-700">
                {kpis.attendance.total} total marked
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          KPI GRID
         ═══════════════════════════════════════════════════════ */}
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CONFIG.map((cfg, idx) => {
            const d = kpis[cfg.key];
            return (
              <KpiCard
                key={cfg.key}
                title={cfg.title}
                value={d.value}
                lastMonth={d.lastMonth}
                sparkline={d.sparkline}
                icon={cfg.icon as any}
                color={cfg.color}
                format={cfg.format}
                index={idx}
                invertTrend={cfg.invertTrend}
              />
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CHARTS — Row 1: Attendance (full width)
         ═══════════════════════════════════════════════════════ */}
      <section aria-label="Attendance trend">
        <AttendanceTrendChart data={charts.attendanceTrend} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          CHARTS — Row 2: Revenue + Admissions
         ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Revenue and admissions"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <RevenueTrendChart    data={charts.revenueTrend}    />
        <AdmissionsChart      data={charts.admissionsChart} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          CHARTS — Row 3: Class Distribution
         ═══════════════════════════════════════════════════════ */}
      <section aria-label="Class distribution">
        <ClassDistributionChart data={charts.classDistribution} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          QUICK LINKS
         ═══════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        aria-label="Quick navigation"
      >
        <p className="text-[12px] font-semibold text-gray-400 uppercase
          tracking-widest mb-3 px-1">
          Quick Navigation
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Promote Students",  href: "/school-admin/promote",      icon: TrendingUp,   color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
            { label: "Bulk Import",       href: "/school-admin/import",        icon: Plus,         color: "text-blue-600 bg-blue-50 border-blue-100"       },
            { label: "Attendance Report", href: "/school-admin/attendance",    icon: CalendarCheck,color: "text-emerald-600 bg-emerald-50 border-emerald-100"},
            { label: "Audit Log",         href: "/school-admin/audit-logs",    icon: Bell,         color: "text-gray-600 bg-gray-50 border-gray-200"        },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-4 py-3.5 bg-white
                border border-gray-100 rounded-2xl
                shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]
                hover:border-gray-200 transition-all duration-200"
            >
              <div className={`w-8 h-8 ${item.color} border
                rounded-xl flex items-center justify-center shrink-0
                transition-transform duration-200 group-hover:scale-105`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-semibold text-gray-700
                group-hover:text-gray-900 transition-colors leading-snug">
                {item.label}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300
                group-hover:text-gray-500 ml-auto shrink-0 transition-colors
                group-hover:translate-x-0.5 duration-200" />
            </Link>
          ))}
        </div>
      </motion.section>

    </div>
  );
}