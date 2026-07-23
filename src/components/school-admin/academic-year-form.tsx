"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { SubmitButton }            from "@/components/ui/submit-button";
import type { ActionResult }       from "@/types/actions";

interface Props {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: { name: string; startDate: Date; endDate: Date; isCurrent: boolean };
  mode:         "create";   // edit not needed — use set-current + delete flow
}

function toDateInput(d: Date | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0]!;
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

// Generate a suggested year name from today e.g. "2025-26"
function suggestYearName(): string {
  const now    = new Date();
  const yr     = now.getFullYear();
  const month  = now.getMonth() + 1;  // 1-12
  // School years typically start in June/July; suggest next if past May
  const base   = month >= 6 ? yr : yr - 1;
  return `${base}-${String(base + 1).slice(-2)}`;
}

export function AcademicYearForm({ action, mode }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError]    = useState<string | null>(null);
  const [fe, setFe]                  =
    useState<Record<string, string[] | undefined>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/academic-years");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  const suggested = suggestYearName();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label className={LABEL}>
          Academic Year Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          defaultValue={suggested}
          placeholder={`e.g. ${suggested}`}
          className={INPUT}
        />
        {fe.name && <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>}
        <p className="text-xs text-gray-400 mt-1.5">
          Must be unique within your school. Suggested: {suggested}
        </p>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="startDate"
            required
            className={INPUT}
          />
          {fe.startDate && (
            <p className="text-xs text-red-500 mt-1">{fe.startDate[0]}</p>
          )}
        </div>
        <div>
          <label className={LABEL}>
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="endDate"
            required
            className={INPUT}
          />
          {fe.endDate && (
            <p className="text-xs text-red-500 mt-1">{fe.endDate[0]}</p>
          )}
        </div>
      </div>

      {/* Set as current */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border
        border-blue-100 rounded-xl">
        <input
          type="checkbox"
          id="isCurrent"
          name="isCurrent"
          className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded
            focus:ring-blue-500"
        />
        <div>
          <label
            htmlFor="isCurrent"
            className="text-sm font-semibold text-blue-900 cursor-pointer"
          >
            Set as current academic year
          </label>
          <p className="text-xs text-blue-600 mt-0.5">
            The current year is used for timetables, exams, and fee
            structures. Only one year can be current at a time.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label="Create Academic Year"
          pendingLabel="Creating…"
        />
        <Link
          href="/school-admin/academic-years"
          className="px-5 py-2.5 text-sm font-medium text-gray-600
            bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}