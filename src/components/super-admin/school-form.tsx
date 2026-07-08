"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { SubmitButton }            from "@/components/ui/submit-button";
import type { ActionResult }       from "@/types/actions";

interface SchoolInitialData {
  name:    string;
  slug:    string;
  email:   string | null;
  phone:   string | null;
  address: string | null;
  status:  string;
}

interface SchoolFormProps {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: SchoolInitialData;
  mode:         "create" | "edit";
}

// Auto-generate a URL-safe slug from a display name
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400 transition";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

const STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Active" },
  { value: "INACTIVE",  label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
] as const;

export function SchoolForm({ action, initialData, mode }: SchoolFormProps) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError]    = useState<string | null>(null);
  const [fe, setFe]                  =
    useState<Record<string, string[] | undefined>>({});

  // Slug state
  const [slug, setSlug]         = useState(initialData?.slug ?? "");
  const [autoSlug, setAutoSlug] = useState(mode === "create");

  // Keep slug in sync with name while in auto mode
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (autoSlug) setSlug(toSlug(e.target.value));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false); // user has taken manual control
    setSlug(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/super-admin/schools");
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

      <div className="space-y-5">

        {/* ── School Name ───────────────────────────────── */}
        <div>
          <label className={LABEL}>
            School Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={initialData?.name ?? ""}
            placeholder="e.g. Greenwood High School"
            onChange={handleNameChange}
            className={INPUT}
          />
          {fe.name && (
            <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>
          )}
        </div>

        {/* ── Slug ─────────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Slug <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-gray-400 ml-2">
              unique identifier used in URLs
            </span>
          </label>
          {/* Prefix display */}
          <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <span className="inline-flex items-center px-3 bg-gray-50 text-xs text-gray-400 border-r border-gray-300 select-none whitespace-nowrap">
              school/
            </span>
            <input
              type="text"
              name="slug"
              required
              value={slug}
              onChange={handleSlugChange}
              placeholder="greenwood-high"
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
            />
          </div>
          {fe.slug && (
            <p className="text-xs text-red-500 mt-1">{fe.slug[0]}</p>
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            Lowercase letters, numbers, and hyphens only. Must be globally
            unique.
          </p>
        </div>

        {/* ── Email + Phone ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL}>
              Contact Email{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email ?? ""}
              placeholder="contact@school.edu"
              className={INPUT}
            />
            {fe.email && (
              <p className="text-xs text-red-500 mt-1">{fe.email[0]}</p>
            )}
          </div>

          <div>
            <label className={LABEL}>
              Phone{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={initialData?.phone ?? ""}
              placeholder="+91 98765 43210"
              className={INPUT}
            />
            {fe.phone && (
              <p className="text-xs text-red-500 mt-1">{fe.phone[0]}</p>
            )}
          </div>
        </div>

        {/* ── Address ───────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Address{" "}
            <span className="text-xs font-normal text-gray-400">
              (optional)
            </span>
          </label>
          <textarea
            name="address"
            rows={3}
            defaultValue={initialData?.address ?? ""}
            placeholder="123 Main Street, Springfield"
            className={`${INPUT} resize-none`}
          />
          {fe.address && (
            <p className="text-xs text-red-500 mt-1">{fe.address[0]}</p>
          )}
        </div>

        {/* ── Status (edit mode only) ───────────────────── */}
        {mode === "edit" && (
          <div>
            <label className={LABEL}>Status</label>
            <select
              name="status"
              defaultValue={initialData?.status ?? "ACTIVE"}
              className={`${INPUT} bg-white`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fe.status && (
              <p className="text-xs text-red-500 mt-1">{fe.status[0]}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Suspended schools cannot be logged into by their users.
            </p>
          </div>
        )}

      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Create School" : "Update School"}
          pendingLabel={mode === "create" ? "Creating…" : "Updating…"}
        />
        <Link
          href="/super-admin/schools"
          className="px-5 py-2.5 text-sm font-medium text-gray-600
            bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>

    </form>
  );
}