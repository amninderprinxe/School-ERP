"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/types/actions";

interface ClassFormProps {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: { name: string };
  mode:         "create" | "edit";
}

export function ClassForm({ action, initialData, mode }: ClassFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[] | undefined>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/classes");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Class Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text" name="name" required defaultValue={initialData?.name}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. Grade 10, Class 5, Form 3"
        />
        {fe.name && <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>}
        <p className="text-xs text-gray-400 mt-1.5">Must be unique within your school.</p>
      </div>

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Class" : "Update Class"}
          pendingLabel={mode === "create" ? "Adding…" : "Updating…"}
        />
        <Link href="/school-admin/classes"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}
