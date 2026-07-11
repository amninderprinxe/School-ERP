import { z } from "zod";

export const ResultEntrySchema = z
  .object({
    studentProfileId: z.string().min(1, "Student ID required"),
    marksObtained: z
      .number("Enter a valid number")
      .min(0, "Cannot be negative")
      .max(9999, "Too large"),
    maxMarks: z
      .number("Enter a valid number" )
      .min(1, "Must be at least 1")
      .max(9999, "Too large"),
    grade:   z.string().max(10, "Grade too long").optional(),
    remarks: z.string().max(300, "Remarks too long").optional(),
  })
  .refine((d) => d.marksObtained <= d.maxMarks, {
    message: "Marks obtained cannot exceed max marks",
    path:    ["marksObtained"],
  });

export const SaveResultsSchema = z.object({
  examId:    z.string().min(1, "Exam required"),
  subjectId: z.string().min(1, "Subject required"),
  sectionId: z.string().min(1, "Section required"),
  entries:   z.array(ResultEntrySchema).min(1, "At least one entry required"),
});

export type ResultEntry     = z.infer<typeof ResultEntrySchema>;
export type SaveResultsInput = z.infer<typeof SaveResultsSchema>;