import { z } from "zod";

// ── Reusable preprocessor: empty string → undefined ────────────
function emptyToUndefined(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Shared base fields ─────────────────────────────────────────
const schoolBase = {
  name: z
    .string()
    .min(2,   "School name must be at least 2 characters")
    .max(150, "School name is too long"),

  slug: z
    .string()
    .min(2,  "Slug must be at least 2 characters")
    .max(60, "Slug must be 60 characters or less")
    .regex(
      slugPattern,
      "Slug can only contain lowercase letters, numbers, and hyphens (e.g. greenwood-high)",
    ),

  email: z.preprocess(
    emptyToUndefined,
    z.string().email("Please enter a valid email address").optional(),
  ),

  phone: z.preprocess(
    emptyToUndefined,
    z.string().max(20, "Phone number is too long").optional(),
  ),

  address: z.preprocess(
    emptyToUndefined,
    z.string().max(300, "Address is too long").optional(),
  ),
};

// ── Create schema (status always ACTIVE on create) ─────────────
export const SchoolCreateSchema = z.object(schoolBase);

// ── Update schema (includes status) ───────────────────────────
export const SchoolUpdateSchema = z.object({
  ...schoolBase,
 status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"], {
  message: "Please select a valid status",
}),
});

export type SchoolCreateInput = z.infer<typeof SchoolCreateSchema>;
export type SchoolUpdateInput = z.infer<typeof SchoolUpdateSchema>;