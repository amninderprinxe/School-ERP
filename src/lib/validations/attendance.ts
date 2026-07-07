import { z } from "zod";

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
] as const;

export type AttendanceStatusType = typeof ATTENDANCE_STATUSES[number];

export const AttendanceEntrySchema = z.object({
  studentProfileId: z.string().min(1, "Student ID is required"),
  status:           z.enum(ATTENDANCE_STATUSES, {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  remarks: z.string().max(200, "Remarks too long").optional(),
});

export const SaveAttendanceSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  date:      z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format — expected YYYY-MM-DD"),
  entries: z
    .array(AttendanceEntrySchema)
    .min(1, "At least one student entry is required"),
});

export type AttendanceEntry    = z.infer<typeof AttendanceEntrySchema>;
export type SaveAttendanceInput = z.infer<typeof SaveAttendanceSchema>;
