import { z } from "zod";

export const AcademicYearSchema = z
  .object({
    name: z
      .string()
      .min(4,  "Name must be at least 4 characters")
      .max(20, "Name is too long")
      .regex(
        /^[\w\s\-\.\/]+$/,
        "Name contains invalid characters",
      ),

    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),

    isCurrent: z
      .boolean()
      .default(false),
  })
  .refine(
    (d) => new Date(d.startDate) < new Date(d.endDate),
    { message: "End date must be after start date", path: ["endDate"] },
  );

export const RolloverSchema = z
  .object({
    fromYearId:   z.string().min(1, "Source year is required"),
    name:         z.string().min(4, "Name required").max(20),
    startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    copyTimetable: z.boolean().default(true),
  })
  .refine(
    (d) => new Date(d.startDate) < new Date(d.endDate),
    { message: "End date must be after start date", path: ["endDate"] },
  );

export type AcademicYearInput = z.infer<typeof AcademicYearSchema>;
export type RolloverInput     = z.infer<typeof RolloverSchema>;