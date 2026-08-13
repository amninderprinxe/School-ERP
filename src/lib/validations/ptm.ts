import { z } from "zod";

export const PTM_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type PtmStatusType = (typeof PTM_STATUSES)[number];

export const PTM_STATUS_LABELS: Record<PtmStatusType, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PTM_STATUS_STYLE: Record<PtmStatusType, string> = {
  SCHEDULED: "bg-blue-50  text-blue-700  border border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-red-50   text-red-600   border border-red-200",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const CreatePTMSlotsSchema = z.object({
  teacherProfileId: z.string().min(1, "Teacher is required"),
  date:             z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime:    z
    .string()
    .regex(TIME_RE, "Use HH:MM format (e.g. 09:00)"),
  durationMins: z
    .number()
    .int()
    .min(5,   "Minimum 5 minutes")
    .max(120, "Maximum 120 minutes"),
  totalSlots: z
    .number()
    .int()
    .min(1,  "At least 1 slot")
    .max(50, "Maximum 50 slots"),
  notes: z.string().max(300).optional(),
});

export const BookPTMSlotSchema = z.object({
  slotId:           z.string().min(1),
  studentProfileId: z.string().min(1, "Please select a child"),
});

export const UpdateMeetingSchema = z.object({
  meetingId:   z.string().min(1),
  status:      z.enum(PTM_STATUSES),
  teacherNote: z.string().max(500).optional(),
});

export type CreatePTMSlotsInput = z.infer<typeof CreatePTMSlotsSchema>;
export type BookPTMSlotInput    = z.infer<typeof BookPTMSlotSchema>;
export type UpdateMeetingInput  = z.infer<typeof UpdateMeetingSchema>;

// ── Generate slot start/end times ─────────────────────────────────

export function generateSlotTimes(
  startTime:    string,
  durationMins: number,
  totalSlots:   number,
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  let totalMinutes = (startH ?? 0) * 60 + (startM ?? 0);

  for (let i = 0; i < totalSlots; i++) {
    const sh = Math.floor(totalMinutes / 60);
    const sm = totalMinutes % 60;
    totalMinutes += durationMins;
    const eh = Math.floor(totalMinutes / 60);
    const em = totalMinutes % 60;

    slots.push({
      startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
      endTime:   `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
    });
  }
  return slots;
}