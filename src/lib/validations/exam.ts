import { z } from "zod";

export const EXAM_TYPES = [
  "UNIT_TEST",
  "MID_TERM",
  "FINAL",
  "ASSIGNMENT",
  "PRACTICAL",
  "OTHER",
] as const;

export const EXAM_TYPE_LABELS: Record<typeof EXAM_TYPES[number], string> = {
  UNIT_TEST:   "Unit Test",
  MID_TERM:    "Mid Term",
  FINAL:       "Final Exam",
  ASSIGNMENT:  "Assignment",
  PRACTICAL:   "Practical",
  OTHER:       "Other",
};

export const ExamSchema = z
  .object({
    name: z
      .string()
      .min(2,   "Exam name must be at least 2 characters")
      .max(150, "Exam name is too long"),

    examType: z.enum(EXAM_TYPES, {
      message: "Please select a valid exam type"
    }),

    classId: z
      .string()
      .min(1, "Please select a class"),

    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .optional()
      .or(z.literal("")),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate && data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path:    ["endDate"],
    },
  );

export type ExamInput = z.infer<typeof ExamSchema>;