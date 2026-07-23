"use server";

import { requireRole }     from "@/lib/session";
import { prisma }          from "@/lib/db";
import { revalidatePath }  from "next/cache";
import { HolidaySchema }   from "@/lib/validations/holiday";
import type { ActionResult } from "@/types/actions";
import { Prisma }          from "@prisma/client";
import type { HolidayType } from "@prisma/client";

const REVALIDATE = "/school-admin/holidays";

// ── Fetch live schoolId ───────────────────────────────────────────
async function getSchoolId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where:  { id: userId },
    select: { schoolId: true },
  });
  return u?.schoolId ?? null;
}

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

export async function createHoliday(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    const parsed = HolidaySchema.safeParse({
      name:        formData.get("name"),
      date:        formData.get("date"),
      type:        formData.get("type"),
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, date, type, description } = parsed.data;

    await prisma.holiday.create({
      data: {
        name:        name.trim(),
        date:        new Date(`${date}T00:00:00.000Z`),
        type:        type as HolidayType,
        description: description?.trim() || null,
        schoolId,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "A holiday already exists on this date.",
        fieldErrors: { date: ["This date is already marked as a holiday."] },
      };
    }
    console.error("[createHoliday]", e);
    return { success: false, error: "Failed to create holiday." };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────

export async function updateHoliday(
  id:       string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const existing = await prisma.holiday.findFirst({
      where: { id, schoolId },
    });
    if (!existing) return { success: false, error: "Holiday not found." };

    const parsed = HolidaySchema.safeParse({
      name:        formData.get("name"),
      date:        formData.get("date"),
      type:        formData.get("type"),
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, date, type, description } = parsed.data;

    await prisma.holiday.update({
      where: { id },
      data:  {
        name:        name.trim(),
        date:        new Date(`${date}T00:00:00.000Z`),
        type:        type as HolidayType,
        description: description?.trim() || null,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "Another holiday already exists on this date.",
        fieldErrors: { date: ["This date is already taken."] },
      };
    }
    console.error("[updateHoliday]", e);
    return { success: false, error: "Failed to update holiday." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const existing = await prisma.holiday.findFirst({
      where: { id, schoolId },
    });
    if (!existing) return { success: false, error: "Holiday not found." };

    await prisma.holiday.delete({ where: { id } });

    revalidatePath(REVALIDATE);
    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch (e) {
    console.error("[deleteHoliday]", e);
    return { success: false, error: "Failed to delete holiday." };
  }
}
