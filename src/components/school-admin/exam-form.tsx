"use client";

import { useState, useTransition }   from "react";
import { useRouter }                 from "next/navigation";
import Link                          from "next/link";
import { SubmitButton }              from "@/components/ui/submit-button";
import {
  EXAM_TYPES,
  EXAM_TYPE_LABELS,
}                                    from "@/lib/validations/exam";
import type { ActionResult }         from "@/types/actions";

interface ClassOption {
  id:   string;
  name: string;
}

interface ExamInitialData {
  name:      string;
  examType:  string;
  classId:   string;
  startDate: Date | null;
  endDate:   Date | null;
}

interface ExamFormProps {
  classes:      ClassOption[];
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: ExamInitialData;
  mode:         "create" | "edit";
  hasResults?:  boolean;   // warn user if trying to change class
}

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0]!;
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400 disabled:bg-gray-50 transition";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function ExamForm({
  classes,
  action,
  initialData,
  mode,
  hasResults = false,
}: ExamFormProps) {
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
        router.push("/school-admin/exams");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Global error ─────────────────────────────────── */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      {/* ── Results warning (edit mode) ──────────────────── */}
      {mode === "edit" && hasResults && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Note:</span> This exam already has
            result records entered. You can update the name, type, and dates,
            but changing the class requires deleting all results first.
          </p>
        </div>
      )}

      <div className="space-y-5">

        {/* ── Exam name ─────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Exam Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={initialData?.name ?? ""}
            placeholder="e.g. Mid Term Examination 2024"
            className={INPUT}
          />
          {fe.name && (
            <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>
          )}
        </div>

        {/* ── Exam type + Class (side by side) ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Exam type */}
          <div>
            <label className={LABEL}>
              Exam Type <span className="text-red-500">*</span>
            </label>
            <select
              name="examType"
              required
              defaultValue={initialData?.examType ?? ""}
              className={`${INPUT} bg-white`}
            >
              <option value="">— Select type —</option>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {fe.examType && (
              <p className="text-xs text-red-500 mt-1">{fe.examType[0]}</p>
            )}
          </div>

          {/* Class */}
          <div>
            <label className={LABEL}>
              Class <span className="text-red-500">*</span>
            </label>
            {classes.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  No classes found.{" "}
                  <Link
                    href="/school-admin/classes/new"
                    className="underline font-semibold"
                  >
                    Create a class first.
                  </Link>
                </p>
              </div>
            ) : (
              <select
                name="classId"
                required
                defaultValue={initialData?.classId ?? ""}
                disabled={mode === "edit" && hasResults}
                className={`${INPUT} bg-white`}
              >
                <option value="">— Select a class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {fe.classId && (
              <p className="text-xs text-red-500 mt-1">{fe.classId[0]}</p>
            )}
            {mode === "edit" && hasResults && (
              <p className="text-xs text-gray-400 mt-1.5">
                Class is locked because results have been entered.
              </p>
            )}
            {/* Hidden field to preserve classId when select is disabled */}
            {mode === "edit" && hasResults && initialData?.classId && (
              <input type="hidden" name="classId" value={initialData.classId} />
            )}
          </div>
        </div>

        {/* ── Date range ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Start date */}
          <div>
            <label className={LABEL}>
              Start Date{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={toDateInput(initialData?.startDate)}
              className={INPUT}
            />
            {fe.startDate && (
              <p className="text-xs text-red-500 mt-1">{fe.startDate[0]}</p>
            )}
          </div>

          {/* End date */}
          <div>
            <label className={LABEL}>
              End Date{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={toDateInput(initialData?.endDate)}
              className={INPUT}
            />
            {fe.endDate && (
              <p className="text-xs text-red-500 mt-1">{fe.endDate[0]}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          End date must be on or after start date if both are provided.
        </p>

      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Create Exam" : "Update Exam"}
          pendingLabel={mode === "create" ? "Creating…" : "Updating…"}
        />
        <Link
          href="/school-admin/exams"
          className="px-5 py-2.5 text-sm font-medium text-gray-600
            bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>

    </form>
  );
}
