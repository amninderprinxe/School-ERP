import { z } from "zod";

export const MAX_PERIODS = 8;

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type DayOfWeekType = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABEL: Record<DayOfWeekType, string> = {
  MONDAY:    "Monday",
  TUESDAY:   "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY:  "Thursday",
  FRIDAY:    "Friday",
  SATURDAY:  "Saturday",
};

export const DAY_SHORT: Record<DayOfWeekType, string> = {
  MONDAY:    "Mon",
  TUESDAY:   "Tue",
  WEDNESDAY: "Wed",
  THURSDAY:  "Thu",
  FRIDAY:    "Fri",
  SATURDAY:  "Sat",
};

// HH:MM 24-hour regex
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const PeriodSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  dayOfWeek: z.enum(DAYS_OF_WEEK, {
    message: "Invalid day of week"  ,
  }),
  periodNumber: z
    .number()
    .int()
    .min(1, "Period number must be at least 1")
    .max(MAX_PERIODS, `Period number must not exceed ${MAX_PERIODS}`),
  subjectId:        z.string().optional(),
  teacherProfileId: z.string().optional(),
  startTime: z
    .string()
    .regex(TIME_RE, "Use HH:MM format (e.g. 08:00)")
    .optional()
    .or(z.literal("")),
  endTime: z
    .string()
    .regex(TIME_RE, "Use HH:MM format (e.g. 08:45)")
    .optional()
    .or(z.literal("")),
});

export type PeriodInput = z.infer<typeof PeriodSchema>;