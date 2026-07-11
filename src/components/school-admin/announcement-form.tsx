"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/types/actions";

interface AnnouncementInitialData {
  title: string;
  content: string;
}

interface AnnouncementFormProps {
  action: (formData: FormData) => Promise<ActionResult>;
  initialData?: AnnouncementInitialData;
  mode: "create" | "edit";
}

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400 transition";

export function AnnouncementForm({
  action,
  initialData,
  mode,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[] | undefined>>({});

  // Live character count for content
  const [contentLen, setContentLen] = useState(
    initialData?.content.length ?? 0,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});

    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/announcements");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Global error banner ───────────────────────────── */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Title ─────────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            defaultValue={initialData?.title ?? ""}
            placeholder="e.g. School Closed for Holiday on Monday"
            maxLength={150}
            className={INPUT}
          />
          {fe.title && (
            <p className="text-xs text-red-500 mt-1">{fe.title[0]}</p>
          )}
        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`${LABEL} mb-0`}>
              Content <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-xs tabular-nums ${
                contentLen > 4800 ? "text-red-500" : "text-gray-400"
              }`}
            >
              {contentLen} / 5000
            </span>
          </div>
          <textarea
            name="content"
            required
            rows={8}
            defaultValue={initialData?.content ?? ""}
            placeholder="Write the full announcement text here…"
            maxLength={5000}
            onChange={(e) => setContentLen(e.target.value.length)}
            className={`${INPUT} resize-y min-h-[140px]`}
          />
          {fe.content && (
            <p className="text-xs text-red-500 mt-1">{fe.content[0]}</p>
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            This will be visible to all users in your school.
          </p>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={
            mode === "create" ? "Publish Announcement" : "Update Announcement"
          }
          pendingLabel={mode === "create" ? "Publishing…" : "Updating…"}
        />
        <Link
          href="/school-admin/announcements"
          className="px-5 py-2.5 text-sm font-medium text-gray-600
            bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
