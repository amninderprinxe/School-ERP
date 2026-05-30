import { z } from "zod";

export const TeacherSchema = z.object({
  name:          z.string().min(2, "Name must be at least 2 characters").max(100),
  email:         z.string().email("Please enter a valid email"),
  gender:        z.string().optional(),
  phone:         z.string().optional(),
  employeeCode:  z.string().optional(),
  qualification: z.string().optional(),
  joiningDate:   z.string().optional(),
});

export type TeacherInput = z.infer<typeof TeacherSchema>;