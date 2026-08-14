"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { AnnouncementSchema } from "@/lib/validations/announcement";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";
import { notifyMany } from "@/lib/notify";
import {
  notifySchool,
  NOTIFICATION_TYPES,
} from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import {
  announcementEmail,
  announcementEmailSubject,
} from "@/lib/email-templates/announcement-email";
import { User } from "lucide-react";



const REVALIDATE = "/school-admin/announcements";

async function getSchoolId(
  userId: string,
): Promise<string | null> {
  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      schoolId: true,
    },
  });

  return currentUser?.schoolId ?? null;
}

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[announcement-audit-log]", error);
  }
}

function revalidateAnnouncementPages() {
  revalidatePath(REVALIDATE);
  revalidatePath("/school-admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
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

    const createdAnnouncement =
      await prisma.announcement.create({
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

    _broadcastAnnouncement({
      schoolId,
      announcementId: createdAnnouncement.id,
      title: parsed.data.title.trim(),
      content: parsed.data.content.trim(),
      publisherName: user.name ?? "Admin",
    });

    async function _broadcastAnnouncement(args: {
      schoolId: string;
      announcementId: string;
      title: string;
      content: string;
      publisherName: string;
    }): Promise<void> {
      try {
        const [school, users] = await Promise.all([
          prisma.school.findUnique({
            where: { id: args.schoolId },
            select: { name: true },
          }),
          prisma.user.findMany({
            where: {
              schoolId: args.schoolId,
              isActive: true,
              email: { not: "" },
              role: { not: "SUPER_ADMIN" },
            },
            select: { id: true, name: true, email: true },
            take: 500,   // safety cap — for very large schools
          }),
        ]);

        notifyMany(
          users.map((u) => ({
            userId: u.id,           // ← use u.id (User.id) not u.email
            schoolId: args.schoolId,
          })),
          {
            title: `Announcement: ${args.title}`,
            body: args.content.length > 120
              ? args.content.slice(0, 117) + "…"
              : args.content,
          },
        );

        if (!school) return;

        const publishedAt = new Date().toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        });

        for (const u of users) {
          if (!u.email) continue;
          sendEmail({
            to: u.email,
            subject: announcementEmailSubject(school.name, args.title),
            html: announcementEmail({
              schoolName: school.name,
              recipientName: u.name,
              title: args.title,
              content: args.content,
              publishedBy: args.publisherName,
              publishedAt,
            }),
          });
        }
      } catch (err) {
        console.error("[announcement email] Failed:", err);
      }
    }

    void notifySchool(
      schoolId,
      {
        title: `New Announcement: ${cleanTitle}`,
        body: cleanContent.slice(0, 120),
        link: "/school-admin/announcements",
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        userId: undefined
      },
      user.id, // exclude the admin who posted it
    );

    void (async () => {
      try {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { name: true },
        });

        const users = await prisma.user.findMany({
          where: {
            schoolId,
            isActive: true,
            id: { not: user.id },
          },
          select: { email: true, name: true },
        });

        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

        const validRecipients: { email: string; name: string }[] = [];

        for (const u of users) {
          if (u.email && u.email.trim()) {
            validRecipients.push({
              email: u.email.trim(),
              name: u.name,
            });
          }
        }

        if (validRecipients.length > 0) {
          await sendAnnouncementEmailBatch(
            validRecipients,
            {
              schoolName: school?.name ?? "School",
              announcementTitle: cleanTitle,
              announcementBody: cleanContent,
              postedBy: user.name ?? "Admin",
              postedAt: new Date(),
              loginUrl,
            },
          );
        }
      } catch (err) {
        console.error("[announcement email]", err);
      }
    })();


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
        contentLength:
          createdAnnouncement.content.length,
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
        "Failed to create announcement. Please try again.",
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

    const existing =
      await prisma.announcement.findFirst({
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

    const updatedAnnouncement =
      await prisma.announcement.update({
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
        previousContentLength:
          existing.content.length,
        contentLength:
          updatedAnnouncement.content.length,
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
      error: "Failed to update announcement.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing =
      await prisma.announcement.findFirst({
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
      error: "Failed to delete announcement.",
    };
  }
}

async function sendAnnouncementEmailBatch(
  recipients: { email: string; name: string; }[],
  data: {
    schoolName: string;
    announcementTitle: string;
    announcementBody: string;
    postedBy: string;
    postedAt: Date;
    loginUrl: string;
  },
): Promise<void> {
  try {
    const publishedAt = data.postedAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      try {
        sendEmail({
          to: recipient.email,
          subject: announcementEmailSubject(data.schoolName, data.announcementTitle),
          html: announcementEmail({
            schoolName: data.schoolName,
            recipientName: recipient.name,
            title: data.announcementTitle,
            content: data.announcementBody,
            publishedBy: data.postedBy,
            publishedAt,
          }),
        });
      } catch (err) {
        console.error(`[sendAnnouncementEmailBatch] Failed to send to ${recipient.email}:`, err);
      }
    }
  } catch (err) {
    console.error("[sendAnnouncementEmailBatch] Batch error:", err);
  }
}
