"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";

type SectionActionResult = {
  success: boolean;
  data?: {
    id?: string;
  };
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

interface ClassOption {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  name: string;
  employeeCode: string | null;
}

interface SectionInitialData {
  name: string;
  classId: string;
  classTeacherId?: string | null;
}

interface SectionFormProps {
  classes: ClassOption[];
  teachers: TeacherOption[];
  action: (formData: FormData) => Promise<SectionActionResult>;
  initialData?: SectionInitialData;
  mode: "create" | "edit";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function SectionForm({
  classes,
  teachers,
  action,
  initialData,
  mode,
}: SectionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  setFormError(null);
  setFieldErrors({});

  const formData = new FormData(e.currentTarget);

  startTransition(async () => {
    const result = await action(formData);

    if (result.success) {
      router.push("/school-admin/sections");
      router.refresh();
      return;
    }

    setFormError(result.error ?? "Something went wrong.");
    setFieldErrors(result.fieldErrors ?? {});
  });
};
  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg">
      {formError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-600">{formError}</p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className={LABEL}>
            Section Name <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            name="name"
            required
            defaultValue={initialData?.name ?? ""}
            className={INPUT}
            placeholder="e.g. A, B, C or Alpha, Beta"
          />

          {fieldErrors.name?.[0] && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.name[0]}
            </p>
          )}

          <p className="mt-1.5 text-xs text-gray-400">
            Must be unique within the selected class.
          </p>
        </div>

        <div>
          <label className={LABEL}>
            Class <span className="text-red-500">*</span>
          </label>

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

          {fieldErrors.classId?.[0] && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.classId[0]}
            </p>
          )}
        </div>

        <div>
          <label className={LABEL}>
            Class Teacher{" "}
            <span className="text-xs font-normal text-gray-400">
              optional
            </span>
          </label>

          <select
            name="classTeacherId"
            defaultValue={initialData?.classTeacherId ?? ""}
            className={`${INPUT} bg-white`}
          >
            <option value="">— No class teacher —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.employeeCode ? ` (${t.employeeCode})` : ""}
              </option>
            ))}
          </select>

          {fieldErrors.classTeacherId?.[0] && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.classTeacherId[0]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 border-t border-gray-100 pt-6">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Section" : "Update Section"}
          pendingLabel={mode === "create" ? "Adding..." : "Updating..."}
        />

        <Link
          href="/school-admin/sections"
          className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}