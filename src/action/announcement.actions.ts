"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { AnnouncementSchema } from "@/lib/validations/announcement";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";
import { notifySchool, NOTIFICATION_TYPES } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import {
  announcementEmail,
  announcementEmailSubject,
} from "@/lib/email-templates/announcement-email";

const REVALIDATE = "/school-admin/announcements";

async function getSchoolId(userId: string): Promise<string | null> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  return currentUser?.schoolId ?? null;
}

async function safelyLogAction(data: Parameters<typeof logAction>[0]) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[announcement-audit-log]", error);
  }
}

function revalidateAnnouncementPages() {
  try {
    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin");
    revalidatePath("/teacher");
    revalidatePath("/student");
    revalidatePath("/notifications");
  } catch (err) {
    console.error("[revalidate-announcement-pages]", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// CREATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    const parsed = AnnouncementSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const cleanTitle = parsed.data.title.trim();
    const cleanContent = parsed.data.content.trim();

    // 1. Create Announcement in Database
    const createdAnnouncement = await prisma.announcement.create({
      data: {
        title: cleanTitle,
        content: cleanContent,
        schoolId,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    // 2. Dispatch in-app notifications safely
    void (async () => {
      try {
        if (typeof notifySchool === "function") {
          await notifySchool(
            schoolId,
            {
              userId: undefined,
              title: `Announcement: ${cleanTitle}`,
              body:
                cleanContent.length > 140
                  ? cleanContent.slice(0, 137) + "…"
                  : cleanContent,
              link: null,
              type: NOTIFICATION_TYPES?.ANNOUNCEMENT ?? "ANNOUNCEMENT",
            },
            user.id, // exclude author
          );
        }
      } catch (notifyErr) {
        console.error("[notifySchool Error]:", notifyErr);
      }
    })();

    // 3. Dispatch batch emails safely in background
    void (async () => {
      try {
        const [school, users] = await Promise.all([
          prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
          }),
          prisma.user.findMany({
            where: {
              schoolId,
              isActive: true,
              email: { not: null },
              id: { not: user.id },
            },
            select: { email: true, name: true },
            take: 500,
          }),
        ]);

        const validRecipients = users
          .filter((u): u is { email: string; name: string } =>
            Boolean(u.email && u.email.trim().length > 0),
          )
          .map((u) => ({ email: u.email!.trim(), name: u.name }));

        if (validRecipients.length > 0 && typeof sendEmail === "function") {
          const publishedAt = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          });

          for (const recipient of validRecipients) {
            try {
              await sendEmail({
                to: recipient.email,
                subject: announcementEmailSubject(
                  school?.name ?? "School",
                  cleanTitle,
                ),
                html: announcementEmail({
                  schoolName: school?.name ?? "School",
                  recipientName: recipient.name,
                  title: cleanTitle,
                  content: cleanContent,
                  publishedBy: user.name ?? "Admin",
                  publishedAt,
                }),
              });
            } catch (err) {
              console.error(
                `[announcement email] Failed for ${recipient.email}:`,
                err,
              );
            }
          }
        }
      } catch (err) {
        console.error("[announcement email batch]", err);
      }
    })();

    // 4. Safely Log Audit Action
    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_ANNOUNCEMENT,
      entity: "Announcement",
      entityId: createdAnnouncement.id,
      entityName: createdAnnouncement.title,
      metadata: {
        contentLength: createdAnnouncement.content.length,
      },
    });

    revalidateAnnouncementPages();

    return {
      success: true,
      message: "Announcement created successfully.",
    };
  } catch (error) {
    console.error("[createAnnouncement]", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create announcement. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────

export async function updateAnnouncement(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    const existing = await prisma.announcement.findFirst({
      where: {
        id,
        schoolId,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Announcement not found.",
      };
    }

    const parsed = AnnouncementSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const cleanTitle = parsed.data.title.trim();
    const cleanContent = parsed.data.content.trim();

    const updatedAnnouncement = await prisma.announcement.update({
      where: {
        id: existing.id,
      },
      data: {
        title: cleanTitle,
        content: cleanContent,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_ANNOUNCEMENT,
      entity: "Announcement",
      entityId: updatedAnnouncement.id,
      entityName: updatedAnnouncement.title,
      metadata: {
        previousTitle: existing.title,
        previousContentLength: existing.content.length,
        contentLength: updatedAnnouncement.content.length,
      },
    });

    revalidateAnnouncementPages();

    return {
      success: true,
      message: "Announcement updated successfully.",
    };
  } catch (error) {
    console.error("[updateAnnouncement]", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update announcement.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.announcement.findFirst({
      where: {
        id,
        schoolId,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Announcement not found.",
      };
    }

    await prisma.announcement.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_ANNOUNCEMENT,
      entity: "Announcement",
      entityId: existing.id,
      entityName: existing.title,
      metadata: {
        contentLength: existing.content.length,
      },
    });

    revalidateAnnouncementPages();

    return {
      success: true,
      message: "Announcement deleted successfully.",
    };
  } catch (error) {
    console.error("[deleteAnnouncement]", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete announcement.",
    };
  }
}