"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rolloverAcademicYear } from "@/action/academic-year.actions";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRightCircle,
} from "lucide-react";

interface SourceYear {
  id: string;
  name: string;
}

interface Props {
  sourceYear: SourceYear;
}

function suggestNext(name: string): string {
  const match = name.match(/(\d{4})-(\d{2,4})/);

  if (match) {
    const start = parseInt(match[1]!);
    const next = start + 1;

    return `${next}-${String(next + 1).slice(-2)}`;
  }

  return "";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400";

const LABEL =
  "block text-sm font-medium text-gray-700 mb-1.5";

export function RolloverForm({
  sourceYear,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [success, setSuccess] = useState<{
    yearId: string;
    periodsCopied: number;
    name: string;
  } | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const suggested = suggestNext(sourceYear.name);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const newYearName = String(
      formData.get("name") ?? "",
    );

    startTransition(async () => {
      const result =
        await rolloverAcademicYear({
          fromYearId: sourceYear.id,
          name: newYearName,
          startDate: String(
            formData.get("startDate") ?? "",
          ),
          endDate: String(
            formData.get("endDate") ?? "",
          ),
          copyTimetable:
            formData.get("copyTimetable") === "on",
        });

      if (result.success) {
        setSuccess({
          yearId: result.data.yearId,
          periodsCopied:
            result.data.periodsCopied,
          name: newYearName,
        });

        setTimeout(() => {
          router.push(
            "/school-admin/academic-years",
          );
          router.refresh();
        }, 2500);

        return;
      }

      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  if (success) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-6">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />

        <div>
          <p className="text-base font-bold text-green-800">
            Rollover complete!
          </p>

          <p className="mt-1 text-sm text-green-700">
            Academic year{" "}
            <strong>{success.name}</strong>{" "}
            created and set as current.
            {success.periodsCopied > 0 && (
              <>
                {" "}
                {success.periodsCopied} timetable
                period(s) copied.
              </>
            )}
          </p>

          <p className="mt-2 text-xs text-green-600">
            Redirecting to Academic Years…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />

          <p className="text-sm font-medium text-red-600">
            {error}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="min-w-[80px] text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            From
          </p>

          <p className="mt-0.5 text-lg font-bold text-gray-700">
            {sourceYear.name}
          </p>
        </div>

        <ArrowRightCircle className="h-6 w-6 shrink-0 text-gray-400" />

        <div className="min-w-[80px] text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            To
          </p>

          <p className="mt-0.5 text-sm font-semibold text-blue-700">
            New Year ↓
          </p>
        </div>
      </div>

      <div>
        <label className={LABEL}>
          New Year Name{" "}
          <span className="text-red-500">*</span>
        </label>

        <input
          type="text"
          name="name"
          required
          defaultValue={suggested}
          placeholder="e.g. 2025-26"
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>
            Start Date{" "}
            <span className="text-red-500">*</span>
          </label>

          <input
            type="date"
            name="startDate"
            required
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>
            End Date{" "}
            <span className="text-red-500">*</span>
          </label>

          <input
            type="date"
            name="endDate"
            required
            className={INPUT}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <input
          type="checkbox"
          id="copyTimetable"
          name="copyTimetable"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />

        <div>
          <label
            htmlFor="copyTimetable"
            className="cursor-pointer text-sm font-semibold text-indigo-900"
          >
            Copy timetable from{" "}
            {sourceYear.name}
          </label>

          <p className="mt-0.5 text-xs text-indigo-600">
            Timetable copying is currently
            disabled by the existing unique
            period constraint. The new academic
            year will still be created safely.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isPending ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>

              Rolling over…
            </>
          ) : (
            <>
              <ArrowRightCircle className="h-4 w-4" />
              Start New Year
            </>
          )}
        </button>
      </div>
    </form>
  );
}