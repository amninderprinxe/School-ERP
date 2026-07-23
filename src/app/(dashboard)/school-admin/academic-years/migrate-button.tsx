"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { migrateTimetableToYear } from "@/action/academic-year.actions";
import { ArrowRightCircle } from "lucide-react";

interface Props { yearId: string; yearName: string }

export function MigrateButton({ yearId, yearName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !confirm(
        `Assign all unscoped timetable periods to "${yearName}"?\n\n` +
        "This action cannot be undone.",
      )
    ) return;

    startTransition(async () => {
      const res = await migrateTimetableToYear(yearId);
      if (res.success) {
        alert(`Migrated ${res.data.migrated} periods.`);
        return;
      }

      if ("error" in res) {
        alert(`Error: ${res.error}`);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm
        font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200
        disabled:opacity-50 rounded-lg transition-colors shrink-0"
    >
      <ArrowRightCircle className="w-4 h-4" />
      {isPending ? "Migrating…" : `Migrate to ${yearName}`}
    </button>
  );
}