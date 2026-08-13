import { z } from "zod";

export const ProfileSchema = z.object({
  name:          z.string().min(2, "Name must be at least 2 characters").max(120),
  tagline:       z.string().max(200).optional().transform((v) => v || null),
  principalName: z.string().max(100).optional().transform((v) => v || null),
  email:         z.string().email("Invalid email").optional()
    .or(z.literal("")).transform((v) => v || null),
  phone:         z.string().max(20).optional().transform((v) => v || null),
  website:       z.string().url("Invalid URL").optional()
    .or(z.literal("")).transform((v) => v || null),
  address:       z.string().max(500).optional().transform((v) => v || null),
  foundedYear:   z.coerce.number().int().min(1800)
    .max(new Date().getFullYear()).optional().nullable(),
  logo:          z.string().optional().transform((v) => v || null),
});

export const BrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  logo:         z.string().optional().transform((v) => v || null),
});

export const AcademicSchema = z.object({
  workingDays:       z.string().min(1, "Select at least one working day"),
  periodsPerDay:     z.coerce.number().int().min(1).max(15),
  periodDurationMin: z.coerce.number().int().min(20).max(120),
  attendanceMinPct:  z.coerce.number().min(0).max(100),
  showRankInResult:  z.boolean(),
});

export const FeeSchema = z.object({
  receiptPrefix:  z.string().max(20),
  lateFeePercent: z.coerce.number().min(0).max(100),
});

export const NotificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications:   z.boolean(),
  maxAbsenceAlert:    z.coerce.number().int().min(1).max(30),
});

export type SchoolSettingsData = {
  id:                  string;
  name:                string;
  email:               string | null;
  phone:               string | null;
  website:             string | null;
  address:             string | null;
  logo:                string | null;
  status:              string;
  tagline:             string | null;
  foundedYear:         number | null;
  principalName:       string | null;
  timezone:            string | null;
  primaryColor:        string | null;
  workingDays:         string | null;
  periodsPerDay:       number | null;
  periodDurationMin:   number | null;
  attendanceMinPct:    number | null;
  receiptPrefix:       string | null;
  lateFeePercent:      number | null;
  emailNotifications:  boolean;
  smsNotifications:    boolean;
  showRankInResult:    boolean;
  maxAbsenceAlert:     number | null;
};