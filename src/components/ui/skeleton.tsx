"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

// ── Base skeleton ─────────────────────────────────────────────────

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-gray-100 dark:bg-gray-800",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-white/40 dark:before:via-white/5 before:to-transparent",
        className,
      )}
      style={style}
    />
  );
}

// ── Card skeleton ─────────────────────────────────────────────────

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800/80 rounded-2xl border",
      "border-gray-100 dark:border-gray-700/60 p-5 space-y-4",
      className,
    )}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-5/6" />
        <Skeleton className="h-2.5 w-4/6" />
      </div>
    </div>
  );
}

// ── Stat card skeleton ────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ── Table skeleton ────────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
      {/* Header */}
      <div className="grid gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 w-3/4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, ri) => (
        <div
          key={ri}
          className="grid gap-4 px-5 py-4 border-b last:border-b-0 border-gray-50 dark:border-gray-700/50"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }, (_, ci) => (
            <Skeleton
              key={ci}
              className="h-3.5"
              style={{ width: `${55 + ((ri * cols + ci) % 4) * 12}%` } as any}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Profile skeleton ──────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      {/* Banner */}
      <Skeleton className="h-36 sm:h-44 rounded-none" />

      {/* Header */}
      <div className="px-4 sm:px-6 -mt-12 flex items-end gap-4">
        <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-gray-900 shrink-0" />
        <div className="flex-1 space-y-2 pb-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 border-b border-gray-100 dark:border-gray-800">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-none" />
        ))}
      </div>

      {/* Content grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

// ── Form skeleton ─────────────────────────────────────────────────

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <div className="flex justify-end pt-4">
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

// ── Dashboard skeleton ────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[280px] rounded-2xl" />
      </div>
    </div>
  );
}