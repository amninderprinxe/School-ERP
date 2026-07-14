import { z } from "zod";

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2,   "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  phone: z
    .string()
    .max(20, "Phone number is too long")
    .optional()
    .or(z.literal("")),

  // Stored as a data URL (base64) — max ~500 KB encoded
  avatarUrl: z
    .string()
    .max(700_000, "Image is too large. Please use a smaller photo (max ~500 KB).")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;