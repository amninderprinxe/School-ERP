"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Users } from "lucide-react";

import { assignStructureToStudents } from "@/action/fee.actions";

type AssignButtonProps = {
  structureId: string;
  label?: string;
};

export function AssignButton({
  structureId,
  label,
}: AssignButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleAssign = () => {
    const confirmed = window.confirm(
      `Assign this fee structure to all applicable active students${
        label ? ` for ${label}` : ""
      }?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const result = await assignStructureToStudents(structureId);

        if (result.success) {
          window.alert(
            [
              "Fee structure assigned successfully.",
              "",
              `Created: ${result.data.created}`,
              `Already assigned: ${result.data.existing}`,
            ].join("\n"),
          );

          router.refresh();
          return;
        }

        if ("error" in result) {
          setError(result.error);
          window.alert(
            `Unable to assign fee structure: ${result.error}`,
          );
        }
      } catch (assignError) {
        console.error("[AssignButton]", assignError);

        const message =
          "Something went wrong while assigning the fee structure.";

        setError(message);
        window.alert(message);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleAssign}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Users className="h-4 w-4" />

        {isPending ? "Assigning..." : "Assign Students"}
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-1.5 max-w-xs text-xs text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
