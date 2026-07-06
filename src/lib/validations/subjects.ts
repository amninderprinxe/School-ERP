import { z } from "zod";

export const SubjectSchema = z.object({
  name:    z.string().min(1, "Subject name is required").max(100, "Name is too long"),
  code:    z.string().max(20,  "Code must be 20 characters or less").optional(),
  classId: z.string().min(1,  "Please select a class"),
});

export type SubjectInput = z.infer<typeof SubjectSchema>;