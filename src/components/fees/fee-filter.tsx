"use client";

import { useRef }          from "react";
import {
  Search, X, SlidersHorizontal, ChevronDown,
}                          from "lucide-react";
import { cn }              from "@/lib/utils";
import type { FeeFilters } from "./use-fee-dashboard";

interface Props {
  filters:      FeeFilters;
  onUpdate:     (key: keyof FeeFilters, value: string) => void;
  classes:      { id: string; name: string }[];
  academicYears: { id: string; name: string; isCurrent: boolean }[];
  total:        number;
  loading:      boolean;
}

const STATUS_OPTIONS = [
  { value: "",        label: "All Students" },
  { value: "PAID",    label: "Fully Paid"   },
  { value: "PENDING", label: "Pending"      },
  { value: "OVERDUE", label: "Overdue"      },
];

const SELECT_BASE = cn(
  "appearance-none bg-white dark:bg-gray-800/80",
  "border border-gray-200 dark:border-gray-700",
  "rounded-xl px-3 py-2.5 pr-8 text-[13px] font-medium",
  "text-gray-700 dark:text-gray-200",
  "focus:outline-none focus:ring-2 focus:ring-blue-500",
  "transition-colors",
);

export function FeeFilters({
  filters, onUpdate, classes, academicYears, total, loading,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters =
    !!filters.classId ||
    !!filters.status  ||
    !!filters.academicYear ||
    !!filters.search;

  const clearAll = () => {
    onUpdate("classId",      "");
    onUpdate("status",       "");
    onUpdate("academicYear", "");
    onUpdate("search",       "");
  };

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl
      border border-gray-100 dark:border-gray-700/60
      shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none p-4">

      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2
            w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden />
          <input
            ref={searchRef}
            type="text"
            value={filters.search}
            onChange={(e) => onUpdate("search", e.target.value)}
            placeholder="Search student, roll number…"
            aria-label="Search students"
            className="w-full bg-gray-50 dark:bg-gray-700/60
              border border-gray-200 dark:border-gray-700
              rounded-xl pl-9 pr-9 py-2.5 text-[13px]
              text-gray-800 dark:text-gray-200
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:bg-white dark:focus:bg-gray-700
              focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => { onUpdate("search", ""); searchRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5
                text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Class filter */}
        <div className="relative">
          <select
            value={filters.classId}
            onChange={(e) => onUpdate("classId", e.target.value)}
            aria-label="Filter by class"
            className={SELECT_BASE}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2
            w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => onUpdate("status", e.target.value)}
            aria-label="Filter by status"
            className={SELECT_BASE}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2
            w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
        </div>

        {/* Academic Year filter */}
        {academicYears.length > 0 && (
          <div className="relative">
            <select
              value={filters.academicYear}
              onChange={(e) => onUpdate("academicYear", e.target.value)}
              aria-label="Filter by academic year"
              className={SELECT_BASE}
            >
              <option value="">All Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.name}>
                  {y.name}{y.isCurrent ? " (Current)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
          </div>
        )}

        {/* Result count + clear */}
        <div className="flex items-center gap-2 ml-auto">
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" aria-hidden />
          )}
          <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {total} student{total !== 1 ? "s" : ""}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-[12px] font-semibold
                text-blue-600 dark:text-blue-400
                hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}