import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT:     "ANNOUNCEMENT",
  EXAM_CREATED:     "EXAM_CREATED",
  RESULT_PUBLISHED: "RESULT_PUBLISHED",
  FEE_RECORDED:     "FEE_RECORDED",
  SYSTEM:           "SYSTEM",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

interface NotifyParams {
  title:    string;
  body?:    string | null;
  link?:    string | null;
  type?:    string;
  schoolId?: string | null;
}

// ─────────────────────────────────────────────────────────────────
// SINGLE USER — fire and forget, never throws
// ─────────────────────────────────────────────────────────────────

export function createNotification(
  userId: string,
  params: NotifyParams,
): void {
  prisma.notification
    .create({
      data: {
        userId,
        schoolId: params.schoolId ?? null,
        title:    params.title,
        body:     params.body  ?? null,
        link:     params.link  ?? null,
        type:     params.type  ?? NOTIFICATION_TYPES.SYSTEM,
      },
    })
    .catch((err) => {
      console.error("[notify] createNotification failed:", err);
    });
}

// ─────────────────────────────────────────────────────────────────
// ALL ACTIVE USERS IN A SCHOOL
// ─────────────────────────────────────────────────────────────────

export async function notifySchool(
  schoolId:      string,
  params:        NotifyParams,
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
        userId:   u.id,
        schoolId,
        title:    params.title,
        body:     params.body  ?? null,
        link:     params.link  ?? null,
        type:     params.type  ?? NOTIFICATION_TYPES.SYSTEM,
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
  params:  NotifyParams,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        schoolId: params.schoolId ?? null,
        title:    params.title,
        body:     params.body  ?? null,
        link:     params.link  ?? null,
        type:     params.type  ?? NOTIFICATION_TYPES.SYSTEM,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("[notify] notifyUsers failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// STUDENT + THEIR LINKED PARENTS
// ─────────────────────────────────────────────────────────────────

export async function notifyStudentAndParents(
  studentProfileId: string,
  params:           NotifyParams,
): Promise<void> {
  try {
    // Student's userId
    const studentProfile = await prisma.studentProfile.findUnique({
      where:   { id: studentProfileId },
      include: {
        user:    { select: { id: true } },
        parents: {
          include: {
            parentProfile: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });

    if (!studentProfile) return;

    const userIds = [
      studentProfile.user.id,
      ...studentProfile.parents.map(
        (p) => p.parentProfile.user.id,
      ),
    ];

    await notifyUsers(userIds, params);
  } catch (err) {
    console.error("[notify] notifyStudentAndParents failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// ALL STUDENTS IN A CLASS + THEIR PARENTS + CLASS TEACHERS
// ─────────────────────────────────────────────────────────────────

export async function notifyClass(
  classId:  string,
  schoolId: string,
  params:   NotifyParams,
): Promise<void> {
  try {
    // Students in class (all sections)
    const studentProfiles = await prisma.studentProfile.findMany({
      where: {
        section:  { classId },
        user:     { schoolId, isActive: true },
      },
      include: {
        user:    { select: { id: true } },
        parents: {
          include: {
            parentProfile: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });

    // Teachers assigned to this class's subjects
    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: {
        subject:        { classId, schoolId },
        teacherProfile: { user: { isActive: true } },
      },
      include: {
        teacherProfile: { include: { user: { select: { id: true } } } },
      },
    });

    const userIdSet = new Set<string>();
    for (const sp of studentProfiles) {
      userIdSet.add(sp.user.id);
      for (const p of sp.parents) {
        userIdSet.add(p.parentProfile.user.id);
      }
    }
    for (const ts of teacherSubjects) {
      userIdSet.add(ts.teacherProfile.user.id);
    }

    await notifyUsers([...userIdSet], params);
  } catch (err) {
    console.error("[notify] notifyClass failed:", err);
  }
}