import { z } from "zod";

export const PromoteStudentsSchema = z.object({
  studentProfileIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one student"),

  // null = graduate (remove section assignment)
  targetSectionId: z.string().nullable(),

  // whether to also deactivate graduated students' accounts
  deactivate: z.boolean().default(false),
});

export type PromoteStudentsInput = z.infer<typeof PromoteStudentsSchema>;

export interface StudentForPromotion {
  id:            string;   // studentProfile.id
  name:          string;
  email:         string;
  rollNumber:    string | null;
  admissionNo:   string | null;
  sectionLabel:  string;   // "Grade 9 — Section A"
}
