"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { updatePTMMeeting }        from "@/action/ptm.actions";
import {
  PTM_STATUSES,
  PTM_STATUS_LABELS,
  PTM_STATUS_STYLE,
  type PtmStatusType,
}                                  from "@/lib/validations/ptm";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  meetingId:   string;
  currentStatus: PtmStatusType;
  currentNote:   string | null;
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function PtmMeetingForm({
  meetingId,
  currentStatus,
  currentNote,
}: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status,    setStatus]       = useState<PtmStatusType>(currentStatus);
  const [note,      setNote]         = useState(currentNote ?? "");
  const [feedback,  setFeedback]     = useState<{
    type: "success" | "error"; msg: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePTMMeeting({
        meetingId,
        status,
        teacherNote: note.trim() || undefined,
      });
      if (res.success) {
        setFeedback({ type: "success", msg: "Meeting updated!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: res.error ?? "An error occured" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t
      border-gray-100 mt-3">

      {/* Status selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-500
          uppercase tracking-wide mb-1.5">
          Update Status
        </label>
        <div className="flex gap-2 flex-wrap">
          {PTM_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full
                border transition-colors
                ${status === s
                  ? PTM_STATUS_STYLE[s]
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400"}`}
            >
              {PTM_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-gray-500
          uppercase tracking-wide mb-1.5">
          Your Note{" "}
          <span className="normal-case font-normal text-gray-400">
            (optional — visible to the student or school staff)
          </span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Add meeting notes, follow-up actions…"
          className={`${INPUT} resize-none`}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium
            ${feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"}`}
        >
          {feedback.type === "success"
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <AlertCircle  className="w-3.5 h-3.5 shrink-0" />}
          {feedback.msg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs
          font-semibold text-white bg-blue-600 hover:bg-blue-700
          disabled:bg-blue-400 rounded-lg transition-colors"
      >
        {isPending ? "Saving…" : "Save Update"}
      </button>
    </form>
  );
}