import { z } from "zod";

export const AnnouncementSchema = z.object({
  title:   z
    .string()
    .min(3,   "Title must be at least 3 characters")
    .max(150, "Title must be 150 characters or less"),
  content: z
    .string()
    .min(10,   "Content must be at least 10 characters")
    .max(5000, "Content must be 5000 characters or less"),
});

export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;