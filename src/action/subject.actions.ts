"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { SubjectSchema } from "@/lib/validations/subjects";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

const REVALIDATE = "/school-admin/subjects";

// ── Fetch live schoolId from database ─────────────────────────────

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

// ── Audit logging should not fail the main action ─────────────────

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[subject-audit-log]", error);
  }
}

// ── Validate selected teachers ────────────────────────────────────

async function validateTeachers(
  ids: string[],
  schoolId: string,
): Promise<boolean> {
  if (ids.length === 0) {
    return true;
  }

  const uniqueIds = [...new Set(ids)];

  const count = await prisma.teacherProfile.count({
    where: {
      id: {
        in: uniqueIds,
      },
      user: {
        schoolId,
        role: "TEACHER",
        isActive: true,
      },
    },
  });

  return count === uniqueIds.length;
}

// ─────────────────────────────────────────────────────────────────
// CREATE SUBJECT
// ─────────────────────────────────────────────────────────────────

export async function createSubject(
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

    const parsed = SubjectSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code") || undefined,
      classId: formData.get("classId"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      code,
      classId,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanCode = code?.trim() || null;

    const teacherProfileIds = [
      ...new Set(
        formData
          .getAll("teacherIds")
          .map(String)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    const schoolClass =
      await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!schoolClass) {
      return {
        success: false,
        error:
          "Selected class does not belong to your school.",
      };
    }

    const teachersAreValid =
      await validateTeachers(
        teacherProfileIds,
        schoolId,
      );

    if (!teachersAreValid) {
      return {
        success: false,
        error:
          "One or more selected teachers do not belong to your school.",
      };
    }

    const createdSubject =
      await prisma.subject.create({
        data: {
          name: cleanName,
          code: cleanCode,
          schoolId,
          classId,

          ...(teacherProfileIds.length > 0 && {
            teachers: {
              create: teacherProfileIds.map(
                (teacherProfileId) => ({
                  teacherProfileId,
                }),
              ),
            },
          }),
        },
        select: {
          id: true,
          name: true,
          code: true,
          classId: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_SUBJECT,
      entity: "Subject",
      entityId: createdSubject.id,
      entityName: createdSubject.name,
      metadata: {
        classId: createdSubject.classId,
        className: schoolClass.name,
        code: createdSubject.code,
        teacherProfileIds,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");

    return {
      success: true,
      message: "Subject created successfully.",
    };
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "A subject with this name already exists in the selected class.",
        fieldErrors: {
          name: [
            "Name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[createSubject]", error);

    return {
      success: false,
      error:
        "Failed to create subject. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE SUBJECT
// ─────────────────────────────────────────────────────────────────

export async function updateSubject(
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
      await prisma.subject.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          classId: true,
          teachers: {
            select: {
              teacherProfileId: true,
            },
          },
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "Subject not found.",
      };
    }

    const parsed = SubjectSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code") || undefined,
      classId: formData.get("classId"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      code,
      classId,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanCode = code?.trim() || null;

    const teacherProfileIds = [
      ...new Set(
        formData
          .getAll("teacherIds")
          .map(String)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    const schoolClass =
      await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!schoolClass) {
      return {
        success: false,
        error:
          "Selected class does not belong to your school.",
      };
    }

    const teachersAreValid =
      await validateTeachers(
        teacherProfileIds,
        schoolId,
      );

    if (!teachersAreValid) {
      return {
        success: false,
        error:
          "One or more selected teachers do not belong to your school.",
      };
    }

    const updatedSubject =
      await prisma.$transaction(async (tx) => {
        await tx.teacherSubject.deleteMany({
          where: {
            subjectId: existing.id,
          },
        });

        const subject =
          await tx.subject.update({
            where: {
              id: existing.id,
            },
            data: {
              name: cleanName,
              code: cleanCode,
              classId,
            },
            select: {
              id: true,
              name: true,
              code: true,
              classId: true,
            },
          });

        if (teacherProfileIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: teacherProfileIds.map(
              (teacherProfileId) => ({
                teacherProfileId,
                subjectId: existing.id,
              }),
            ),
          });
        }

        return subject;
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_SUBJECT,
      entity: "Subject",
      entityId: updatedSubject.id,
      entityName: updatedSubject.name,
      metadata: {
        classId: updatedSubject.classId,
        className: schoolClass.name,
        code: updatedSubject.code,
        teacherProfileIds,

        previousName: existing.name,
        previousCode: existing.code,
        previousClassId: existing.classId,
        previousTeacherProfileIds:
          existing.teachers.map(
            (teacher) =>
              teacher.teacherProfileId,
          ),
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");
    revalidatePath("/teacher");

    return {
      success: true,
      message: "Subject updated successfully.",
    };
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "A subject with this name already exists in the selected class.",
        fieldErrors: {
          name: [
            "Name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[updateSubject]", error);

    return {
      success: false,
      error: "Failed to update subject.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE SUBJECT
// ─────────────────────────────────────────────────────────────────

export async function deleteSubject(
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
      await prisma.subject.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          classId: true,
          class: {
            select: {
              name: true,
            },
          },
          teachers: {
            select: {
              teacherProfileId: true,
            },
          },
          _count: {
            select: {
              results: true,
              periods: true,
            },
          },
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "Subject not found.",
      };
    }

    const linkedRecordCount =
      existing._count.results +
      existing._count.periods;

    if (linkedRecordCount > 0) {
      return {
        success: false,
        error:
          "This subject cannot be deleted because results or timetable periods are linked to it.",
      };
    }

    await prisma.subject.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_SUBJECT,
      entity: "Subject",
      entityId: existing.id,
      entityName: existing.name,
      metadata: {
        classId: existing.classId,
        className: existing.class.name,
        code: existing.code,
        teacherProfileIds:
          existing.teachers.map(
            (teacher) =>
              teacher.teacherProfileId,
          ),
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");
    revalidatePath("/teacher");

    return {
      success: true,
      message: "Subject deleted successfully.",
    };
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        error:
          "This subject cannot be deleted because other records are linked to it.",
      };
    }

    console.error("[deleteSubject]", error);

    return {
      success: false,
      error: "Failed to delete subject.",
    };
  }
}
