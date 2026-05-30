import { z } from "zod";

export const SectionSchema = z.object({
  name:            z.string().min(1, "Section name is required").max(20),
  classId:         z.string().min(1, "Please select a class"),
  classTeacherId:  z.string().optional(),
});

export type SectionInput = z.infer<typeof SectionSchema>;