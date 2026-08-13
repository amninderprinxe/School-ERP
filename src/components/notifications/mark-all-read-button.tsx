"use client";

import { useTransition } from "react";
import { useRouter }     from "next/navigation";
import { CheckCheck }    from "lucide-react";

export function MarkAllReadButton() {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await fetch("/api/notifications/read-all", { method: "POST" });
        router.refresh();
      } catch {
        // silently ignore
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
        font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100
        disabled:opacity-50 rounded-lg transition-colors border
        border-blue-200"
    >
      <CheckCheck className="w-4 h-4" />
      {isPending ? "Marking…" : "Mark all read"}
    </button>
  );
}