import { z } from "zod";

export const StudentSchema = z.object({
  name:        z.string().min(2, "Name must be at least 2 characters").max(100),
  email:       z.string().email("Please enter a valid email"),
  gender:      z.string().optional(),
  phone:       z.string().optional(),
  rollNumber:  z.string().optional(),
  admissionNo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup:  z.string().optional(),
  sectionId:   z.string().optional(),
});

export type StudentInput = z.infer<typeof StudentSchema>;
