"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMonth, shiftMonth } from "@/lib/attendance-utils";

interface Props {
  currentMonth:  string;
  maxMonth?:     string;    // default = today's month (can't navigate forward)
  minMonth?:     string;    // optional floor
  preserveKeys?: string[];  // other URL params to keep when navigating
}

export function MonthFilter({
  currentMonth,
  maxMonth,
  minMonth,
  preserveKeys = [],
}: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const todayMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const cap        = maxMonth ?? todayMonth;
  const prev       = shiftMonth(currentMonth, -1);
  const next       = shiftMonth(currentMonth,  1);
  const canNext    = next <= cap;
  const canPrev    = minMonth ? prev >= minMonth : true;

  const navigate = (month: string) => {
    const params = new URLSearchParams();
    for (const key of preserveKeys) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }
    params.set("month", month);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200
      rounded-xl px-2 py-1.5 shadow-sm">

      {/* Prev */}
      <button
        onClick={() => navigate(prev)}
        disabled={!canPrev}
        aria-label="Previous month"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
          hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Label */}
      <div className="flex items-center gap-1.5 px-2">
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-sm font-semibold text-gray-700 w-32 text-center">
          {formatMonth(currentMonth)}
        </span>
      </div>

      {/* Next */}
      <button
        onClick={() => navigate(next)}
        disabled={!canNext}
        aria-label="Next month"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
          hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}