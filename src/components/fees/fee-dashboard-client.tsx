"use client";

import { useState }              from "react";
import { motion }                from "framer-motion";
import Link                      from "next/link";
import {
  RefreshCw, AlertTriangle, LayoutGrid, List,
  Plus, Download, Wallet,
}                                from "lucide-react";
import { cn }                    from "@/lib/utils";
import { useFeeDashboard }       from "./use-fee-dashboard";
import { FeeKpiStrip }           from "./fee-kpi-strip";
import { CollectionCharts }      from "./collection-charts";
import { FeeFilters }            from "./fee-filter";
import { StudentFeeCard }        from "./student-fee-card";
import { PaymentTimeline }       from "./fee-payment-timeline";
import {
  FeeKpiSkeleton,
  FeeChartSkeleton,
  FeeCardSkeleton,
}                                from "./fee-skeleton";

type LayoutMode = "grid" | "list";

// ── Shimmer CSS ───────────────────────────────────────────────────

const SHIMMER_CSS = `
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// ─────────────────────────────────────────────────────────────────

export function FeeDashboardClient() {
  const {
    data, loading, error, filters, updateFilter, refetch,
  } = useFeeDashboard();

  const [layout, setLayout] = useState<LayoutMode>("grid");

  const isFirstLoad = loading && !data;

  return (
    <div className="space-y-5 pb-8">
      <style>{SHIMMER_CSS}</style>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Fee Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Finance dashboard — collections, dues and student payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/school-admin/fees/categories"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px]
              font-semibold text-gray-700 dark:text-gray-200
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              hover:bg-gray-50 dark:hover:bg-gray-700
              rounded-xl transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/school-admin/fees/structures"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px]
              font-semibold text-gray-700 dark:text-gray-200
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              hover:bg-gray-50 dark:hover:bg-gray-700
              rounded-xl transition-colors"
          >
            Fee Structures
          </Link>
          <Link
            href="/school-admin/fees/collect"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px]
              font-semibold text-white bg-blue-600 hover:bg-blue-700
              rounded-xl transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden />
            Collect Fee
          </Link>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/30
          border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold
              text-red-600 dark:text-red-400 hover:text-red-800"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Retry
          </button>
        </div>
      )}

      {/* ── KPI strip ───────────────────────────────────── */}
      {isFirstLoad ? (
        <FeeKpiSkeleton />
      ) : data ? (
        <FeeKpiStrip kpis={data.kpis} />
      ) : null}

      {/* ── Charts row ──────────────────────────────────── */}
      {isFirstLoad ? (
        <FeeChartSkeleton />
      ) : data ? (
        <CollectionCharts trend={data.monthlyTrend} byMode={data.byMode} />
      ) : null}

      {/* ── Filters ─────────────────────────────────────── */}
      {data && (
        <FeeFilters
          filters={filters}
          onUpdate={updateFilter}
          classes={data.classes}
          academicYears={data.academicYears}
          total={data.total}
          loading={loading}
        />
      )}

      {/* ── Layout toggle ────────────────────────────────── */}
      {data && data.students.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
            {data.total} student{data.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
            {([
              { value: "grid", icon: LayoutGrid },
              { value: "list", icon: List       },
            ] as const).map((opt) => {
              const Icon     = opt.icon;
              const isActive = layout === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  aria-label={`${opt.value} layout`}
                  aria-pressed={isActive}
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700",
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Student fee cards ────────────────────────────── */}
      {isFirstLoad ? (
        <FeeCardSkeleton />
      ) : data?.students.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border
          border-gray-100 dark:border-gray-700/60 py-16 text-center">
          <Wallet className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" aria-hidden />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            No students found
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Try adjusting your filters
          </p>
        </div>
      ) : data ? (
        <div className={cn(
          "grid gap-4",
          layout === "grid"
            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1",
        )}>
          {data.students.map((student, i) => (
            <StudentFeeCard
              key={student.studentProfileId}
              student={student}
              index={i}
            />
          ))}
        </div>
      ) : null}

      {/* ── Payment timeline ──────────────────────────────── */}
      {data && data.recentPayments.length > 0 && (
        <PaymentTimeline payments={data.recentPayments} />
      )}
    </div>
  );
}