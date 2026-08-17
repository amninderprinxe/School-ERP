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

async function getSchoolId(userId: string): Promise<string | null> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  return currentUser?.schoolId ?? null;
}

// ── Audit logging wrapper ─────────────────────────────────────────

async function safelyLogAction(data: Parameters<typeof logAction>[0]) {
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
  if (ids.length === 0) return true;

  const uniqueIds = [...new Set(ids)];

  const count = await prisma.teacherProfile.count({
    where: {
      id: { in: uniqueIds },
      user: {
        schoolId,
        role: "TEACHER",
        isActive: true,
      },
    },
  });

  return count === uniqueIds.length;
}

// ── Validate selected sections ────────────────────────────────────

async function validateSections(
  sectionIds: string[],
  classId: string,
  schoolId: string,
): Promise<boolean> {
  if (sectionIds.length === 0) return false;

  const count = await prisma.section.count({
    where: {
      id: { in: sectionIds },
      classId,
      schoolId,
    },
  });

  return count === sectionIds.length;
}

// ─────────────────────────────────────────────────────────────────
// CREATE / ASSIGN SUBJECT
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
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, code, classId } = parsed.data;
    const cleanName = name.trim();
    const cleanCode = code?.trim() || null;

    // Extract Section IDs from form
    const rawSectionIds = [
      ...formData.getAll("sectionIds"),
      ...formData.getAll("sectionId"),
    ]
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);

    let sectionIds = [...new Set(rawSectionIds)];

    // Teacher ID (optional)
    const rawTeacherId =
      (formData.get("teacherId") as string) ||
      (formData.get("teacherProfileId") as string) ||
      (formData.getAll("teacherIds")[0] as string);
    const teacherProfileId = rawTeacherId?.trim() || null;

    // Verify class belongs to the school
    const schoolClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: { sections: { select: { id: true, name: true } } },
    });

    if (!schoolClass) {
      return {
        success: false,
        error: "Selected class does not belong to your school.",
      };
    }

    // Fallback: If no section was selected, assign to all sections in that class
    if (sectionIds.length === 0) {
      sectionIds = schoolClass.sections.map((s) => s.id);
    }

    if (sectionIds.length === 0) {
      return {
        success: false,
        error: "Please create at least one section for this class before adding subjects.",
      };
    }

    // Validate sections belong to class
    const sectionsAreValid = await validateSections(sectionIds, classId, schoolId);
    if (!sectionsAreValid) {
      return {
        success: false,
        error: "One or more selected sections are invalid for this class.",
      };
    }

    // Validate teacher if provided
    if (teacherProfileId) {
      const teacherIsValid = await validateTeachers([teacherProfileId], schoolId);
      if (!teacherIsValid) {
        return {
          success: false,
          error: "Selected teacher does not belong to your school.",
        };
      }
    }

    // 1. Find existing subject or create new (eliminates duplicate constraint error)
    let targetSubject = await prisma.subject.findFirst({
      where: {
        schoolId,
        classId,
        name: cleanName,
      },
    });

    if (!targetSubject) {
      targetSubject = await prisma.subject.create({
        data: {
          name: cleanName,
          code: cleanCode,
          schoolId,
          classId,
        },
      });
    } else if (cleanCode && targetSubject.code !== cleanCode) {
      targetSubject = await prisma.subject.update({
        where: { id: targetSubject.id },
        data: { code: cleanCode },
      });
    }

    // 2. Safe mapping creation/update per section
    for (const sectionId of sectionIds) {
      const existingMapping = await prisma.teacherSubject.findFirst({
        where: {
          subjectId: targetSubject.id,
          sectionId,
        },
      });

      if (existingMapping) {
        if (teacherProfileId) {
          await prisma.teacherSubject.update({
            where: { id: existingMapping.id },
            data: { teacherProfileId },
          });
        }
      } else {
        await prisma.teacherSubject.create({
          data: {
            subjectId: targetSubject.id,
            sectionId,
            ...(teacherProfileId ? { teacherProfileId } : {}),
          },
        });
      }
    }

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_SUBJECT,
      entity: "Subject",
      entityId: targetSubject.id,
      entityName: targetSubject.name,
      metadata: {
        classId: targetSubject.classId,
        className: schoolClass.name,
        code: targetSubject.code,
        sectionIds,
        teacherProfileId,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/school-admin/classes");
    revalidatePath("/school-admin/timetable");

    return {
      success: true,
      message: "Subject successfully assigned to selected sections.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A subject with this name already exists in the selected class.",
        fieldErrors: {
          name: ["Name must be unique within a class."],
        },
      };
    }

    console.error("[createSubject]", error);

    return {
      success: false,
      error: "Failed to create or assign subject. Please try again.",
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

    const existing = await prisma.subject.findFirst({
      where: { id, schoolId },
      include: {
        teachers: {
          select: {
            id: true,
            sectionId: true,
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
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, code, classId } = parsed.data;
    const cleanName = name.trim();
    const cleanCode = code?.trim() || null;

    const rawSectionIds = [
      ...formData.getAll("sectionIds"),
      ...formData.getAll("sectionId"),
    ]
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);

    let sectionIds = [...new Set(rawSectionIds)];

    const rawTeacherId =
      (formData.get("teacherId") as string) ||
      (formData.get("teacherProfileId") as string) ||
      (formData.getAll("teacherIds")[0] as string);
    const teacherProfileId = rawTeacherId?.trim() || null;

    const schoolClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: { sections: { select: { id: true, name: true } } },
    });

    if (!schoolClass) {
      return {
        success: false,
        error: "Selected class does not belong to your school.",
      };
    }

    // Default to existing sections if none submitted
    if (sectionIds.length === 0) {
      sectionIds = existing.teachers.map((t) => t.sectionId);
    }
    if (sectionIds.length === 0) {
      sectionIds = schoolClass.sections.map((s) => s.id);
    }

    if (teacherProfileId) {
      const teacherIsValid = await validateTeachers([teacherProfileId], schoolId);
      if (!teacherIsValid) {
        return {
          success: false,
          error: "Selected teacher does not belong to your school.",
        };
      }
    }

    const updatedSubject = await prisma.$transaction(async (tx) => {
      const subject = await tx.subject.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          code: cleanCode,
          classId,
        },
      });

      // Remove section assignments no longer selected
      await tx.teacherSubject.deleteMany({
        where: {
          subjectId: existing.id,
          sectionId: { notIn: sectionIds },
        },
      });

      // Safe update/create selected section mappings
      for (const sectionId of sectionIds) {
        const existingMapping = await tx.teacherSubject.findFirst({
          where: {
            subjectId: existing.id,
            sectionId,
          },
        });

        if (existingMapping) {
          if (teacherProfileId) {
            await tx.teacherSubject.update({
              where: { id: existingMapping.id },
              data: { teacherProfileId },
            });
          }
        } else {
          await tx.teacherSubject.create({
            data: {
              subjectId: existing.id,
              sectionId,
              ...(teacherProfileId ? { teacherProfileId } : {}),
            },
          });
        }
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
        sectionIds,
        teacherProfileId,
        previousName: existing.name,
        previousCode: existing.code,
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
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A subject with this name already exists in the selected class.",
        fieldErrors: {
          name: ["Name must be unique within a class."],
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

export async function deleteSubject(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.subject.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        classId: true,
        class: { select: { name: true } },
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
      existing._count.results + existing._count.periods;

    if (linkedRecordCount > 0) {
      return {
        success: false,
        error: "This subject cannot be deleted because results or timetable periods are linked to it.",
      };
    }

    await prisma.subject.delete({
      where: { id: existing.id },
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
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        error: "This subject cannot be deleted because other records are linked to it.",
      };
    }

    console.error("[deleteSubject]", error);

    return {
      success: false,
      error: "Failed to delete subject.",
    };
  }
}