"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { SubmitButton }            from "@/components/ui/submit-button";
import type { ActionResult }       from "@/types/actions";

interface Props {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: { name: string; description?: string | null };
  mode:         "create" | "edit";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400";

export function FeeCategoryForm({ action, initialData, mode }: Props) {
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
        router.push("/school-admin/fees/categories");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-5">
      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category Name <span className="text-red-500">*</span>
        </label>
        <input type="text" name="name" required defaultValue={initialData?.name ?? ""}
          placeholder="e.g. Tuition, Transport, Library"
          className={INPUT} />
        {fe.name && <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea name="description" rows={3} defaultValue={initialData?.description ?? ""}
          placeholder="Brief description of this fee category…"
          className={`${INPUT} resize-none`} />
        {fe.description && <p className="text-xs text-red-500 mt-1">{fe.description[0]}</p>}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <SubmitButton isPending={isPending}
          label={mode === "create" ? "Add Category" : "Update Category"}
          pendingLabel={mode === "create" ? "Adding…" : "Updating…"} />
        <Link href="/school-admin/fees/categories"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
            hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}