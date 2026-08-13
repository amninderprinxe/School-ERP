"use client";

import { useState, useTransition }   from "react";
import { AnimatePresence, motion }   from "framer-motion";
import {
  X, Calendar, CheckCircle2, AlertCircle, Loader2,
}                                    from "lucide-react";
import { cn }                        from "@/lib/utils";

interface Props {
  open:         boolean;
  defaultDate?: string | null;
  onClose:      () => void;
  onSuccess:    () => void;
}

const EVENT_TYPES = [
  { value: "EVENT",       label: "Event"       },
  { value: "SPORTS",      label: "Sports"      },
  { value: "CULTURAL",    label: "Cultural"    },
  { value: "MEETING",     label: "Meeting"     },
  { value: "CELEBRATION", label: "Celebration" },
  { value: "LEAVE",       label: "Staff Leave" },
  { value: "OTHER",       label: "Other"       },
];

const COLOR_PRESETS = [
  "#059669", "#2563eb", "#7c3aed", "#db2777",
  "#d97706", "#dc2626", "#0891b2", "#374151",
];

const INPUT = cn(
  "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  "placeholder-gray-400 bg-white",
);

const LABEL = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

export function AddEventModal({ open, defaultDate, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);
  const [success,   setSuccess]      = useState(false);

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [startDate,   setStartDate]   = useState(defaultDate ?? "");
  const [endDate,     setEndDate]     = useState("");
  const [allDay,      setAllDay]      = useState(true);
  const [startTime,   setStartTime]   = useState("09:00");
  const [endTime,     setEndTime]     = useState("10:00");
  const [eventType,   setEventType]   = useState("EVENT");
  const [color,       setColor]       = useState("#059669");

  // Reset on open
  const handleOpen = () => {
    setTitle("");
    setDescription("");
    setStartDate(defaultDate ?? "");
    setEndDate("");
    setAllDay(true);
    setStartTime("09:00");
    setEndTime("10:00");
    setEventType("EVENT");
    setColor("#059669");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) {
      setError("Title and start date are required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/calendar/events", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            title:       title.trim(),
            description: description.trim() || undefined,
            startDate,
            endDate:     endDate || undefined,
            allDay,
            startTime:   allDay ? undefined : startTime,
            endTime:     allDay ? undefined : endTime,
            type:        eventType,
            color,
          }),
        });
        if (!res.ok) throw new Error("Failed to create event");
        setSuccess(true);
        setTimeout(onSuccess, 700);
      } catch {
        setError("Failed to create event. Please try again.");
      }
    });
  };

  return (
    <AnimatePresence onExitComplete={handleOpen}>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center
            p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0,   scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl
                border border-gray-100 overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4
                border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <Calendar
                      className="w-4 h-4"
                      style={{ color }}
                      aria-hidden
                    />
                  </div>
                  <h2 className="text-[15px] font-bold text-gray-900">
                    Add School Event
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700
                    hover:bg-gray-100 transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>

              {/* Success state */}
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center
                      justify-center"
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" aria-hidden />
                  </motion.div>
                  <p className="text-[15px] font-bold text-gray-900">Event created!</p>
                  <p className="text-sm text-gray-500">Adding to calendar…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

                    {error && (
                      <div className="flex items-center gap-2.5 p-3 bg-red-50
                        border border-red-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <label className={LABEL}>
                        Event Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Annual Sports Day"
                        required
                        maxLength={120}
                        className={INPUT}
                        autoFocus
                      />
                    </div>

                    {/* Type + Color row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Event Type</label>
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className={INPUT}
                        >
                          {EVENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Color</label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setColor(c)}
                              aria-label={`Select color ${c}`}
                              className={cn(
                                "w-7 h-7 rounded-lg transition-all",
                                color === c
                                  ? "ring-2 ring-offset-2 ring-gray-600 scale-110"
                                  : "hover:scale-105",
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>End Date (optional)</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className={INPUT}
                        />
                      </div>
                    </div>

                    {/* All-day toggle */}
                    <div
                      onClick={() => setAllDay((p) => !p)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer",
                        "transition-colors select-none",
                        allDay
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          "transition-colors",
                          allDay
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-400 bg-white",
                        )}
                      >
                        {allDay && (
                          <CheckCircle2 className="w-3 h-3 text-white" aria-hidden />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">
                          All-day event
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          No specific time needed
                        </p>
                      </div>
                    </div>

                    {/* Time pickers */}
                    {!allDay && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div>
                          <label className={LABEL}>Start Time</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className={INPUT}
                          />
                        </div>
                        <div>
                          <label className={LABEL}>End Time</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={INPUT}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Description */}
                    <div>
                      <label className={LABEL}>Description (optional)</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Add details about this event…"
                        className={cn(INPUT, "resize-none")}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 px-5 py-4
                    border-t border-gray-100 bg-gray-50/60">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-[13px] font-medium text-gray-600
                        bg-white border border-gray-200 hover:bg-gray-50
                        rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      style={{ backgroundColor: color }}
                      className="inline-flex items-center gap-2 px-5 py-2 text-[13px]
                        font-semibold text-white rounded-xl transition-opacity
                        disabled:opacity-60 focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-offset-2
                        focus-visible:ring-blue-500"
                    >
                      {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Creating…</>
                      ) : (
                        <>Create Event</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}