"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/types/actions";

interface RowActionsProps {
  editHref:     string;
  deleteAction: () => Promise<ActionResult>;
  entityLabel?: string;
}

export function RowActions({ editHref, deleteAction, entityLabel = "record" }: RowActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Delete this ${entityLabel}? This action cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteAction();
      if (!result.success) alert(result.error);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={editHref}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
          text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
          text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
