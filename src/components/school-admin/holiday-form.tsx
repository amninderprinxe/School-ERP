"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { SubmitButton }            from "@/components/ui/submit-button";
import {
  HOLIDAY_TYPES,
  HOLIDAY_TYPE_LABELS,
}                                  from "@/lib/validations/holiday";
import type { ActionResult }       from "@/types/actions";

interface InitialData {
  name:        string;
  date:        Date;
  type:        string;
  description: string | null;
}

interface Props {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: InitialData;
  mode:         "create" | "edit";
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400 bg-white";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

function toDateInput(d: Date | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0]!;
}

export function HolidayForm({ action, initialData, mode }: Props) {
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
        router.push("/school-admin/holidays");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Error banner */}
      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label className={LABEL}>
          Holiday Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          defaultValue={initialData?.name ?? ""}
          placeholder="e.g. Independence Day, Diwali, Winter Break"
          className={INPUT}
        />
        {fe.name && (
          <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>
        )}
      </div>

      {/* Date + Type side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Date */}
        <div>
          <label className={LABEL}>
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInput(initialData?.date)}
            className={INPUT}
          />
          {fe.date && (
            <p className="text-xs text-red-500 mt-1">{fe.date[0]}</p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className={LABEL}>
            Holiday Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            defaultValue={initialData?.type ?? "SCHOOL"}
            className={INPUT}
          >
            {HOLIDAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {HOLIDAY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {fe.type && (
            <p className="text-xs text-red-500 mt-1">{fe.type[0]}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={LABEL}>
          Description{" "}
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initialData?.description ?? ""}
          placeholder="Additional notes about this holiday…"
          className={`${INPUT} resize-none`}
        />
        {fe.description && (
          <p className="text-xs text-red-500 mt-1">{fe.description[0]}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Holiday" : "Update Holiday"}
          pendingLabel={mode === "create" ? "Adding…"  : "Updating…"}
        />
        <Link
          href="/school-admin/holidays"
          className="px-5 py-2.5 text-sm font-medium text-gray-600
            bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
