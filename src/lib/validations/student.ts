import { z } from "zod";

const optionalPassword = z
  .string()
  .optional()
  .refine((val) => !val || val.length >= 8, {
    message: "Password must be at least 8 characters",
  });

export const StudentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),

  email: z.string().email("Please enter a valid email"),

  gender: z.string().optional(),
  phone: z.string().optional(),

  rollNumber: z.string().optional(),
  admissionNo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  sectionId: z.string().optional(),
});

export const CreateStudentSchema = StudentSchema;
export const UpdateStudentSchema = StudentSchema.partial();

export type StudentInput = z.infer<typeof StudentSchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;