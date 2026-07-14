"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { SubmitButton }            from "@/components/ui/submit-button";
import type { ActionResult }       from "@/types/actions";

interface CategoryOption { id: string; name: string }
interface ClassOption    { id: string; name: string }

interface Props {
  categories:  CategoryOption[];
  classes:     ClassOption[];
  action:      (formData: FormData) => Promise<ActionResult>;
  initialData?: {
    feeCategoryId: string;
    classId:       string | null;
    amount:        number;
    academicYear:  string;
    dueDate:       Date | null;
    description:   string | null;
  };
  mode: "create" | "edit";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function FeeStructureForm({ categories, classes, action, initialData, mode }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError]    = useState<string | null>(null);
  const [fe, setFe]                  = useState<Record<string, string[] | undefined>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/fees/structures");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  const dueDateStr = initialData?.dueDate
    ? new Date(initialData.dueDate).toISOString().split("T")[0]
    : "";

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fee Category <span className="text-red-500">*</span>
          </label>
          <select name="feeCategoryId" required
            defaultValue={initialData?.feeCategoryId ?? ""}
            className={`${INPUT} bg-white`}>
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {fe.feeCategoryId && <p className="text-xs text-red-500 mt-1">{fe.feeCategoryId[0]}</p>}
        </div>

        {/* Class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Applicable Class{" "}
            <span className="text-xs font-normal text-gray-400">(leave blank = all classes)</span>
          </label>
          <select name="classId" defaultValue={initialData?.classId ?? ""}
            className={`${INPUT} bg-white`}>
            <option value="">All Classes (school-wide)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input type="number" name="amount" required min={1} step="0.01"
            defaultValue={initialData?.amount ?? ""}
            placeholder="12000" className={INPUT} />
          {fe.amount && <p className="text-xs text-red-500 mt-1">{fe.amount[0]}</p>}
        </div>

        {/* Academic Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Academic Year <span className="text-red-500">*</span>
          </label>
          <input type="text" name="academicYear" required
            defaultValue={initialData?.academicYear ?? ""}
            placeholder="e.g. 2024-25" className={INPUT} />
          {fe.academicYear && <p className="text-xs text-red-500 mt-1">{fe.academicYear[0]}</p>}
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Due Date <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input type="date" name="dueDate" defaultValue={dueDateStr} className={INPUT} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input type="text" name="description"
            defaultValue={initialData?.description ?? ""}
            placeholder="e.g. Term 1 Tuition Fee" className={INPUT} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton isPending={isPending}
          label={mode === "create" ? "Create Structure" : "Update Structure"}
          pendingLabel={mode === "create" ? "Creating…" : "Updating…"} />
        <Link href="/school-admin/fees/structures"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
            hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}