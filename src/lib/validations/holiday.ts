import { z } from "zod";

export const HOLIDAY_TYPES = ["PUBLIC", "SCHOOL", "EVENT"] as const;

export const HOLIDAY_TYPE_LABELS: Record<(typeof HOLIDAY_TYPES)[number], string> = {
  PUBLIC: "Public Holiday",
  SCHOOL: "School Holiday",
  EVENT:  "School Event",
};

export const HOLIDAY_TYPE_STYLE: Record<(typeof HOLIDAY_TYPES)[number], string> = {
  PUBLIC: "bg-blue-50  text-blue-700  border border-blue-200",
  SCHOOL: "bg-amber-50 text-amber-700 border border-amber-200",
  EVENT:  "bg-green-50 text-green-700 border border-green-200",
};

export const HolidaySchema = z.object({
  name: z
    .string()
    .min(2,   "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date — use YYYY-MM-DD"),

  type: z.enum(HOLIDAY_TYPES, {
    message: "Please select a valid holiday type",
  }),

  description: z
    .string()
    .max(300, "Description is too long")
    .optional(),
});

export type HolidayInput = z.infer<typeof HolidaySchema>;