"use client";

import { useTransition } from "react";
import { Mail }          from "lucide-react";
import { sendFeeReminders } from "@/action/fee-reminder.actions";

interface Props {
  structureId: string;
  pendingCount: number;
}

export function SendReminderButton({ structureId, pendingCount }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (pendingCount === 0) {
      alert("No pending or partial payments to remind.");
      return;
    }
    if (
      !confirm(
        `Send fee due reminder emails to ${pendingCount} pending student(s) and their parents?`,
      )
    ) return;

    startTransition(async () => {
      const res = await sendFeeReminders(structureId);
      if (res.success && res.data) {
        // res.data may not have a typed 'sent' property; guard and fallback
        const sent = res.data && typeof res.data === "object" && "sent" in res.data
          ? (res.data as any).sent
          : 0;
        alert(`✅ Reminder emails sent to ${sent} recipient(s).`);
      } else if (!res.success) {
        alert(`❌ ${res.error}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || pendingCount === 0}
      title={
        pendingCount === 0
          ? "No pending payments"
          : `Send reminder to ${pendingCount} pending student(s)`
      }
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
        font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100
        disabled:opacity-40 disabled:cursor-not-allowed
        rounded-lg transition-colors"
    >
      <Mail className="w-3.5 h-3.5" />
      {isPending ? "Sending…" : `Remind (${pendingCount})`}
    </button>
  );
}
