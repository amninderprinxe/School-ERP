"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/types/actions";

interface ClassOption {
  id:   string;
  name: string;
}

interface TeacherOption {
  id:           string; // teacherProfile.id
  name:         string;
  employeeCode: string | null;
}

interface SubjectInitialData {
  name:                      string;
  code:                      string | null;
  classId:                   string;
  assignedTeacherProfileIds: string[];
}

interface SubjectFormProps {
  classes:      ClassOption[];
  teachers:     TeacherOption[];
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: SubjectInitialData;
  mode:         "create" | "edit";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function SubjectForm({
  classes,
  teachers,
  action,
  initialData,
  mode,
}: SubjectFormProps) {
  const router                        = useRouter();
  const [isPending, startTransition]  = useTransition();
  const [formError, setFormError]     = useState<string | null>(null);
  const [fe, setFe]                   = useState<Record<string, string[] | undefined>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/subjects");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Global error ──────────────────────────────────── */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="space-y-5">

        {/* ── Name + Code ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div>
            <label className={LABEL}>
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialData?.name ?? ""}
              placeholder="e.g. Mathematics, Physics"
              className={INPUT}
            />
            {fe.name && (
              <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>
            )}
          </div>

          <div>
            <label className={LABEL}>
              Subject Code{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="text"
              name="code"
              defaultValue={initialData?.code ?? ""}
              placeholder="e.g. MATH-10"
              className={INPUT}
            />
            {fe.code && (
              <p className="text-xs text-red-500 mt-1">{fe.code[0]}</p>
            )}
          </div>
        </div>

        {/* ── Class ────────────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Class <span className="text-red-500">*</span>
          </label>

          {classes.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                No classes found. Please{" "}
                <Link
                  href="/school-admin/classes/new"
                  className="underline font-medium"
                >
                  create a class
                </Link>{" "}
                before adding subjects.
              </p>
            </div>
          ) : (
            <select
              name="classId"
              required
              defaultValue={initialData?.classId ?? ""}
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
          <p className="text-xs text-gray-400 mt-1.5">
            Subject name must be unique within the selected class.
          </p>
        </div>

        {/* ── Teachers (checkboxes) ────────────────────────── */}
        <div>
          <label className={LABEL}>
            Assign Teachers{" "}
            <span className="text-xs font-normal text-gray-400">
              (optional — tick one or more)
            </span>
          </label>

          {teachers.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                No teachers found. Add teachers first to assign them here.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {teachers.map((t) => {
                const checked =
                  initialData?.assignedTeacherProfileIds.includes(t.id) ??
                  false;
                return (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="teacherIds"
                      value={t.id}
                      defaultChecked={checked}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.name}
                      </p>
                      {t.employeeCode && (
                        <p className="text-xs text-gray-400">{t.employeeCode}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Submit / Cancel ───────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Subject" : "Update Subject"}
          pendingLabel={mode === "create" ? "Adding…" : "Updating…"}
        />
        <Link
          href="/school-admin/subjects"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>

    </form>
  );
}