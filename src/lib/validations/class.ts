import { z } from "zod";

export const ClassSchema = z.object({
  name: z.string().min(1, "Class name is required").max(50, "Class name is too long"),
});

export type ClassInput = z.infer<typeof ClassSchema>;
