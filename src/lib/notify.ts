import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "ANNOUNCEMENT",
  EXAM_CREATED: "EXAM_CREATED",
  RESULT_PUBLISHED: "RESULT_PUBLISHED",
  FEE_RECORDED: "FEE_RECORDED",
  SYSTEM: "SYSTEM",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

interface NotifyParams {
  userId: any;
  title: string;
  body?: string | null;
  link?: string | null;
  type?: string;
  schoolId?: string | null;
}

// ── Single notification ───────────────────────────────────────────

export function createNotification(params: NotifyParams): void;
export function createNotification(userId: string, params: NotifyParams): void;
export function createNotification(
  userIdOrParams: string | NotifyParams,
  params?: NotifyParams,
): void {
  const actualUserId =
    typeof userIdOrParams === "string" ? userIdOrParams : userIdOrParams.userId;
  const actualParams =
    typeof userIdOrParams === "string" ? params! : userIdOrParams;

  prisma.notification
    .create({
      data: {
        userId: actualUserId,
        schoolId: actualParams.schoolId ?? null,
        title: actualParams.title,
        body: actualParams.body ?? null,
        link: actualParams.link ?? null,
        type: actualParams.type ?? NOTIFICATION_TYPES.SYSTEM,
      },
    })
    .catch((err) => {
      console.error("[notify] createNotification failed:", err);
    });
}

// ── Bulk: same title/body/link to many users ──────────────────────

export function notifyMany(
  recipients: Array<{ userId: string; schoolId?: string | null }>,
  shared:     { title: string; body?: string; link?: string },
): void {
  if (recipients.length === 0) return;

  // Use createMany for efficiency; ignore duplicates
  prisma.notification
    .createMany({
      data: recipients.map((r) => ({
        userId:   r.userId,
        schoolId: r.schoolId ?? null,
        title:    shared.title,
        body:     shared.body ?? null,
        link:     shared.link ?? null,
      })),
      skipDuplicates: false,
    })
    .catch((err) => console.error("[notify] Bulk failed:", shared.title, err));
}

// ─────────────────────────────────────────────────────────────────
// ALL ACTIVE USERS IN A SCHOOL
// ─────────────────────────────────────────────────────────────────

export async function notifySchool(
  schoolId: string,
  params: NotifyParams,
  excludeUserId?: string,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        schoolId,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
        type: params.type ?? NOTIFICATION_TYPES.SYSTEM,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("[notify] notifySchool failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// SPECIFIC LIST OF USER IDs
// ─────────────────────────────────────────────────────────────────

export async function notifyUsers(
  userIds: string[],
  params: NotifyParams,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        schoolId: params.schoolId ?? null,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
        type: params.type ?? NOTIFICATION_TYPES.SYSTEM,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("[notify] notifyUsers failed:", err);
  }
}

