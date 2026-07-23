"use client";

import { useTransition }  from "react";
import { useRouter }      from "next/navigation";
import { setCurrentYear } from "@/action/academic-year.actions";

interface Props { yearId: string; yearName: string }

export function SetCurrentButton({ yearId, yearName }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !confirm(
        `Set "${yearName}" as the current academic year?\n\n` +
        "All timetable, exam, and fee filtering will switch to this year.",
      )
    ) return;

    startTransition(async () => {
      const res = await setCurrentYear(yearId);
      if (res.success) router.refresh();
      else              alert(`Error: ${res.error}`);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold
        text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50
        rounded-lg transition-colors"
    >
      {isPending ? "Setting…" : "Set Current"}
    </button>
  );
}