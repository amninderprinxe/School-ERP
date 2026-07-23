"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Baby } from "lucide-react";
import { formatMonth, shiftMonth } from "@/lib/attendance-utils";

export interface ChildOption {
  studentProfileId: string;
  name:             string;
  relation:         string | null;
}

interface Props {
  children:     ChildOption[];
  selectedId:   string;
  currentMonth: string;
}

export function ParentFilters({
  children,
  selectedId,
  currentMonth,
}: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const todayMonth = new Date().toISOString().slice(0, 7);
  const prev       = shiftMonth(currentMonth, -1);
  const next       = shiftMonth(currentMonth,  1);
  const canNext    = next <= todayMonth;

  // Build URL with updated param, keeping the other one
  const navigate = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) params.set(k, v);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* ── Child selector (only if multiple children) ────── */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 bg-white border
          border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Baby className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedId}
            onChange={(e) => navigate({ childId: e.target.value })}
            className="text-sm font-semibold text-gray-700 bg-transparent
              focus:outline-none cursor-pointer"
          >
            {children.map((c) => (
              <option key={c.studentProfileId} value={c.studentProfileId}>
                {c.name}
                {c.relation ? ` (${c.relation})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Month navigator ───────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-gray-200
        rounded-xl px-2 py-1.5 shadow-sm">

        {/* Prev */}
        <button
          onClick={() => navigate({ month: prev })}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
            hover:bg-gray-100 transition-colors"
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
          onClick={() => navigate({ month: next })}
          disabled={!canNext}
          aria-label="Next month"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
            hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
