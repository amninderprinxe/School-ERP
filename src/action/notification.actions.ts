"use server";

import { auth }                from "@/lib/auth";
import { prisma }              from "@/lib/db";
import { revalidatePath }      from "next/cache";
import type { ActionResult }   from "@/types/actions";

// ── Lightweight DTO (avoids sending full Prisma object) ────────────

export interface NotificationDTO {
  id:        string;
  title:     string;
  body:      string | null;
  link:      string | null;
  type:      string;
  isRead:    boolean;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────
// GET UNREAD COUNT
// ─────────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return await (prisma as any).notification.count({
      where: { userId: session.user.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────
// GET RECENT NOTIFICATIONS (for bell dropdown)
// ─────────────────────────────────────────────────────────────────

export async function getRecentNotifications(): Promise<NotificationDTO[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await (prisma as any).notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    15,
      select: {
        id:        true,
        title:     true,
        body:      true,
        link:      true,
        type:      true,
        isRead:    true,
        createdAt: true,
      },
    });

    return rows;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// GET ALL NOTIFICATIONS (for the full page)
// ─────────────────────────────────────────────────────────────────

export async function getAllNotifications(
  filter: "all" | "unread" | "read" = "all",
  page   = 1,
): Promise<{ notifications: NotificationDTO[]; total: number }> {
  const PAGE_SIZE = 30;
  try {
    const session = await auth();
    if (!session?.user?.id) return { notifications: [], total: 0 };

    const where = {
      userId: session.user.id,
      ...(filter === "unread" ? { isRead: false } : {}),
      ...(filter === "read"   ? { isRead: true  } : {}),
    };

    const [rows, total] = await Promise.all([
      (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take:    PAGE_SIZE,
        skip:    (page - 1) * PAGE_SIZE,
        select: {
          id:        true,
          title:     true,
          body:      true,
          link:      true,
          type:      true,
          isRead:    true,
          createdAt: true,
        },
      }),
      (prisma as any).notification.count({ where }),
    ]);

    return { notifications: rows, total };
  } catch {
    return { notifications: [], total: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────
// MARK ONE AS READ
// ─────────────────────────────────────────────────────────────────

export async function markNotificationRead(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated." };

    await (prisma as any).notification.updateMany({
      where: { id, userId: session.user.id },
      data:  { isRead: true },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark notification." };
  }
}

// ─────────────────────────────────────────────────────────────────
// MARK ALL AS READ
// ─────────────────────────────────────────────────────────────────

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated." };

    await (prisma as any).notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data:  { isRead: true },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark all notifications." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ONE NOTIFICATION
// ─────────────────────────────────────────────────────────────────

export async function deleteNotification(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated." };

    await (prisma as any).notification.deleteMany({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete notification." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ALL NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

export async function deleteAllNotifications(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated." };

    await (prisma as any).notification.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete notifications." };
  }
}