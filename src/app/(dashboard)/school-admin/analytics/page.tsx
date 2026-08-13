"use client";

import { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence }  from "framer-motion";
import {
  CalendarCheck, Wallet, GraduationCap,
  BookOpen, BarChart3,
}                                   from "lucide-react";
import { cn }                       from "@/lib/utils";

// Lazy load each section so only one fetches at a time
const AttendanceCharts = lazy(() =>
  import("@/components/analytics/attendance-charts").then(m => ({ default: m.AttendanceCharts })),
);
const FinanceCharts = lazy(() =>
  import("@/components/analytics/finance-charts").then(m => ({ default: m.FinanceCharts })),
);
const AdmissionsCharts = lazy(() =>
  import("@/components/analytics/admissions-charts").then(m => ({ default: m.AdmissionsCharts })),
);
const AcademicsCharts = lazy(() =>
  import("@/components/analytics/academics-charts").then(m => ({ default: m.AcademicsCharts })),
);

// ── Tab config ────────────────────────────────────────────────────

type TabId = "attendance" | "finance" | "admissions" | "academics";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    id:          "attendance",
    label:       "Attendance",
    icon:        CalendarCheck,
    description: "Daily, weekly and monthly attendance analysis",
  },
  {
    id:          "finance",
    label:       "Finance",
    icon:        Wallet,
    description: "Revenue, fee collection and outstanding dues",
  },
  {
    id:          "admissions",
    label:       "Admissions",
    icon:        GraduationCap,
    description: "Monthly and yearly enrollment trends",
  },
  {
    id:          "academics",
    label:       "Academics",
    icon:        BookOpen,
    description: "Subject performance and pass rates",
  },
];

// ── Section skeleton ──────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[76px] bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-3 w-64 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="flex items-end gap-2" style={{ height: 260 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded-t-md animate-pulse"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("attendance");

  const activeConf = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600
              rounded-xl flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-white" aria-hidden />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Analytics
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            {activeConf.description}
          </p>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Analytics sections"
        className="flex flex-wrap gap-2"
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "text-[13px] font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-white rounded-xl border border-gray-200
                    shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-blue-600" : "text-gray-400",
                  )}
                  aria-hidden
                />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <Suspense fallback={<SectionSkeleton />}>
            {activeTab === "attendance"  && <AttendanceCharts  />}
            {activeTab === "finance"     && <FinanceCharts     />}
            {activeTab === "admissions"  && <AdmissionsCharts  />}
            {activeTab === "academics"   && <AcademicsCharts   />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}