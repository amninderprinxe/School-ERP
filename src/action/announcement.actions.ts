"use server";

import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import { revalidatePath }    from "next/cache";
import { AnnouncementSchema } from "@/lib/validations/announcement";
import type { ActionResult } from "@/types/actions";

const REVALIDATE = "/school-admin/announcements";

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────
export async function createAnnouncement(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    const parsed = AnnouncementSchema.safeParse({
      title:   formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await prisma.announcement.create({
      data: {
        title:    parsed.data.title.trim(),
        content:  parsed.data.content.trim(),
        schoolId,
      },
    });

    revalidatePath(REVALIDATE);
    // Also revalidate dashboards that show announcements
    revalidatePath("/school-admin");
    revalidatePath("/teacher");
    revalidatePath("/student");
    revalidatePath("/parent");

    return { success: true };
  } catch (e) {
    console.error("[createAnnouncement]", e);
    return { success: false, error: "Failed to create announcement. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
export async function updateAnnouncement(
  id:       string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    // Confirm ownership — announcement must belong to this school
    const existing = await prisma.announcement.findFirst({
      where: { id, schoolId },
    });
    if (!existing)
      return { success: false, error: "Announcement not found." };

    const parsed = AnnouncementSchema.safeParse({
      title:   formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await prisma.announcement.update({
      where: { id },
      data:  {
        title:   parsed.data.title.trim(),
        content: parsed.data.content.trim(),
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin");
    revalidatePath("/teacher");
    revalidatePath("/student");
    revalidatePath("/parent");

    return { success: true };
  } catch (e) {
    console.error("[updateAnnouncement]", e);
    return { success: false, error: "Failed to update announcement." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────
export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const existing = await prisma.announcement.findFirst({
      where: { id, schoolId },
    });
    if (!existing)
      return { success: false, error: "Announcement not found." };

    await prisma.announcement.delete({ where: { id } });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin");
    revalidatePath("/teacher");
    revalidatePath("/student");
    revalidatePath("/parent");

    return { success: true };
  } catch (e) {
    console.error("[deleteAnnouncement]", e);
    return { success: false, error: "Failed to delete announcement." };
  }
}