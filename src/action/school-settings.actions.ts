"use server";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

// ── Shared Types ──────────────────────────────────────────────────
export type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

// ── Shared Helper: Extract & Validate School Session ──────────────
async function getAuthenticatedSchoolId(allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]): Promise<string> {
  const user = await requireRole(allowedRoles);

  let schoolId = user.schoolId;
  if (!schoolId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    });
    schoolId = dbUser?.schoolId ?? null;
  }

  if (!schoolId) {
    throw new Error("School account not found for current user session.");
  }

  return schoolId;
}

// ─────────────────────────────────────────────────────────────────
// 1. PROFILE SECTION (Super Admin Restricted)
// ─────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
  principalName: z.string().optional().nullable(),
  foundedYear: z.coerce.number().optional().nullable(),
  timezone: z.string().min(1, "Timezone is required"),
});

export async function updateSchoolProfile(formData: FormData): Promise<ActionResult> {
  try {
    // Restricted strictly to SUPER_ADMIN
    const schoolId = await getAuthenticatedSchoolId(["SUPER_ADMIN"]);

    const getCleanString = (key: string) => {
      const val = formData.get(key);
      return typeof val === "string" && val.trim() !== "" ? val.trim() : null;
    };

    const rawData = {
      name: getCleanString("name") || "",
      email: getCleanString("email") || "",
      phone: getCleanString("phone"),
      website: getCleanString("website"),
      address: getCleanString("address"),
      tagline: getCleanString("tagline"),
      principalName: getCleanString("principalName"),
      foundedYear: formData.get("foundedYear") ? Number(formData.get("foundedYear")) : null,
      timezone: getCleanString("timezone") || "Asia/Kolkata",
    };

    const parsed = profileSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid profile data",
      };
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: parsed.data,
    });

    revalidatePath("/school-admin/settings");
    return { success: true, message: "Profile updated successfully!" };
  } catch (error: any) {
    console.error("[updateSchoolProfile]", error);
    return { success: false, error: error.message || "Unauthorized or update failed." };
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. BRANDING SECTION
// ─────────────────────────────────────────────────────────────────
const brandingSchema = z.object({
  primaryColor: z
    .string()
    .trim()
    .regex(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid Hex color code"),
  logoUrl: z.string().optional().nullable(),
});

export async function updateSchoolBranding(formData: FormData): Promise<ActionResult> {
  try {
    const schoolId = await getAuthenticatedSchoolId();

    const rawColor = formData.get("primaryColor") as string;
    const logoUrl = formData.get("logoUrl") as string | null;

    const parsed = brandingSchema.safeParse({ primaryColor: rawColor, logoUrl });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid branding format",
      };
    }

    let formattedColor = parsed.data.primaryColor;
    if (!formattedColor.startsWith("#")) {
      formattedColor = `#${formattedColor}`;
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        primaryColor: formattedColor,
        ...(parsed.data.logoUrl && { logoUrl: parsed.data.logoUrl }),
      },
    });

    revalidatePath("/school-admin/settings");
    return { success: true, message: "Branding updated successfully!" };
  } catch (error: any) {
    console.error("[updateSchoolBranding]", error);
    return { success: false, error: error.message || "Failed to update branding." };
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. ACADEMIC SECTION
// ─────────────────────────────────────────────────────────────────
const academicSchema = z.object({
  workingDays: z.coerce.string().min(1, "Working days are required"), // Coerced as String to match Prisma schema
  periodsPerDay: z.coerce.number().min(1).max(20),
  periodDurationMin: z.coerce.number().min(10).max(180),
  attendanceMinPct: z.coerce.number().min(0).max(100),
});

export async function updateAcademicSettings(formData: FormData): Promise<ActionResult> {
  try {
    const schoolId = await getAuthenticatedSchoolId();

    const rawData = {
      workingDays: formData.get("workingDays"),
      periodsPerDay: formData.get("periodsPerDay"),
      periodDurationMin: formData.get("periodDurationMin"),
      attendanceMinPct: formData.get("attendanceMinPct"),
    };

    const parsed = academicSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid academic settings data.",
      };
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: parsed.data,
    });

    revalidatePath("/school-admin/settings");
    return { success: true, message: "Academic settings updated successfully!" };
  } catch (error: any) {
    console.error("[updateAcademicSettings]", error);
    return { success: false, error: error.message || "Failed to update academic settings." };
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. FEE SETTINGS SECTION
// ─────────────────────────────────────────────────────────────────
const feeSettingsSchema = z.object({
  receiptPrefix: z.string().min(1, "Receipt prefix is required").max(10),
  lateFeePercent: z.coerce.number().min(0).max(100),
});

export async function updateFeeSettings(formData: FormData): Promise<ActionResult> {
  try {
    const schoolId = await getAuthenticatedSchoolId();

    const rawData = {
      receiptPrefix: formData.get("receiptPrefix"),
      lateFeePercent: formData.get("lateFeePercent"),
    };

    const parsed = feeSettingsSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid fee settings",
      };
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: parsed.data,
    });

    revalidatePath("/school-admin/settings");
    return { success: true, message: "Fee settings updated successfully!" };
  } catch (error: any) {
    console.error("[updateFeeSettings]", error);
    return { success: false, error: error.message || "Failed to update fee settings." };
  }
}

// ─────────────────────────────────────────────────────────────────
// 5. NOTIFICATION SETTINGS SECTION
// ─────────────────────────────────────────────────────────────────
const notificationSchema = z.object({
  emailNotifications: z.coerce.boolean(),
  smsNotifications: z.coerce.boolean(),
  showRankInResult: z.coerce.boolean(),
  maxAbsenceAlert: z.coerce.number().min(1).max(30),
});

export async function updateNotificationSettings(formData: FormData): Promise<ActionResult> {
  try {
    const schoolId = await getAuthenticatedSchoolId();

    const rawData = {
      emailNotifications: formData.get("emailNotifications") === "true",
      smsNotifications: formData.get("smsNotifications") === "true",
      showRankInResult: formData.get("showRankInResult") === "true",
      maxAbsenceAlert: formData.get("maxAbsenceAlert"),
    };

    const parsed = notificationSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid notification preferences",
      };
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: parsed.data,
    });

    revalidatePath("/school-admin/settings");
    return { success: true, message: "Notification preferences updated successfully!" };
  } catch (error: any) {
    console.error("[updateNotificationSettings]", error);
    return { success: false, error: error.message || "Failed to update notification settings." };
  }
}