"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { SectionSchema } from "@/lib/validations/section";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

const REVALIDATE = "/school-admin/sections";

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
    console.error("[section-audit-log]", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// CREATE SECTION
// ─────────────────────────────────────────────────────────────────

export async function createSection(
  formData: FormData,
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

    const parsed = SectionSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );

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
      classId,
      classTeacherId,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanClassTeacherId =
      classTeacherId || null;

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

    if (cleanClassTeacherId) {
      const teacherProfile =
        await prisma.teacherProfile.findFirst({
          where: {
            id: cleanClassTeacherId,
            user: {
              schoolId,
              role: "TEACHER",
              isActive: true,
            },
          },
          select: {
            id: true,
          },
        });

      if (!teacherProfile) {
        return {
          success: false,
          error:
            "Selected teacher does not belong to your school.",
        };
      }
    }

    const createdSection =
      await prisma.section.create({
        data: {
          name: cleanName,
          schoolId,
          classId,
          classTeacherId:
            cleanClassTeacherId,
        },
        select: {
          id: true,
          name: true,
          classId: true,
          classTeacherId: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_SECTION,
      entity: "Section",
      entityId: createdSection.id,
      entityName: createdSection.name,
      metadata: {
        classId: createdSection.classId,
        className: schoolClass.name,
        classTeacherId:
          createdSection.classTeacherId,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");

    return {
      success: true,
      message: "Section created successfully.",
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
          "A section with this name already exists in the selected class.",
        fieldErrors: {
          name: [
            "Section name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[createSection]", error);

    return {
      success: false,
      error: "Failed to create section.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE SECTION
// ─────────────────────────────────────────────────────────────────

export async function updateSection(
  id: string,
  formData: FormData,
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
      await prisma.section.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          classId: true,
          classTeacherId: true,
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "Section not found.",
      };
    }

    const parsed = SectionSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );

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
      classId,
      classTeacherId,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanClassTeacherId =
      classTeacherId || null;

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

    if (cleanClassTeacherId) {
      const teacherProfile =
        await prisma.teacherProfile.findFirst({
          where: {
            id: cleanClassTeacherId,
            user: {
              schoolId,
              role: "TEACHER",
              isActive: true,
            },
          },
          select: {
            id: true,
          },
        });

      if (!teacherProfile) {
        return {
          success: false,
          error:
            "Selected teacher does not belong to your school.",
        };
      }
    }

    const updatedSection =
      await prisma.section.update({
        where: {
          id: existing.id,
        },
        data: {
          name: cleanName,
          classId,
          classTeacherId:
            cleanClassTeacherId,
        },
        select: {
          id: true,
          name: true,
          classId: true,
          classTeacherId: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_SECTION,
      entity: "Section",
      entityId: updatedSection.id,
      entityName: updatedSection.name,
      metadata: {
        classId: updatedSection.classId,
        className: schoolClass.name,
        classTeacherId:
          updatedSection.classTeacherId,
        previousName: existing.name,
        previousClassId: existing.classId,
        previousClassTeacherId:
          existing.classTeacherId,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");

    return {
      success: true,
      message: "Section updated successfully.",
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
          "A section with this name already exists in the selected class.",
        fieldErrors: {
          name: [
            "Section name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[updateSection]", error);

    return {
      success: false,
      error: "Failed to update section.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE SECTION
// ─────────────────────────────────────────────────────────────────

export async function deleteSection(
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
      await prisma.section.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          classId: true,
          classTeacherId: true,
          class: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              students: true,
              attendance: true,
              periods: true,
              studentRecords: true,
            },
          },
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "Section not found.",
      };
    }

    const linkedRecords =
      existing._count.students +
      existing._count.attendance +
      existing._count.periods +
      existing._count.studentRecords;

    if (linkedRecords > 0) {
      return {
        success: false,
        error:
          "This section cannot be deleted because students or academic records are linked to it.",
      };
    }

    await prisma.section.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_SECTION,
      entity: "Section",
      entityId: existing.id,
      entityName: existing.name,
      metadata: {
        classId: existing.classId,
        className: existing.class.name,
        classTeacherId:
          existing.classTeacherId,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");

    return {
      success: true,
      message: "Section deleted successfully.",
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
          "This section cannot be deleted because other records are linked to it.",
      };
    }

    console.error("[deleteSection]", error);

    return {
      success: false,
      error: "Failed to delete section.",
    };
  }
}
