"use server";

import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubjectSchema }  from "@/lib/validations/subjects";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const REVALIDATE = "/school-admin/subjects";

// ── Verify every teacher profile belongs to this school ──────────
async function validateTeachers(
  ids:      string[],
  schoolId: string,
): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await prisma.teacherProfile.count({
    where: { id: { in: ids }, user: { schoolId } },
  });
  return count === ids.length;
}

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────
export async function createSubject(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    const parsed = SubjectSchema.safeParse({
      name:    formData.get("name"),
      code:    formData.get("code") || undefined,
      classId: formData.get("classId"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, code, classId }  = parsed.data;
    const teacherProfileIds        = formData
      .getAll("teacherIds")
      .map(String)
      .filter(Boolean);

    // Class must belong to this school
    const schoolClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!schoolClass)
      return {
        success: false,
        error:   "Selected class does not belong to your school.",
      };

    // Teachers must belong to this school
    if (!(await validateTeachers(teacherProfileIds, schoolId)))
      return {
        success: false,
        error:   "One or more selected teachers do not belong to your school.",
      };

    await prisma.subject.create({
      data: {
        name:     name.trim(),
        code:     code?.trim() || null,
        schoolId,
        classId,
        ...(teacherProfileIds.length > 0 && {
          teachers: {
            create: teacherProfileIds.map((id) => ({
              teacherProfileId: id,
            })),
          },
        }),
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "A subject with this name already exists in the selected class.",
        fieldErrors: { name: ["Name must be unique within a class."] },
      };
    }
    console.error("[createSubject]", e);
    return { success: false, error: "Failed to create subject. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
export async function updateSubject(
  id:       string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Subject not found." };

    const parsed = SubjectSchema.safeParse({
      name:    formData.get("name"),
      code:    formData.get("code") || undefined,
      classId: formData.get("classId"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, code, classId }  = parsed.data;
    const teacherProfileIds        = formData
      .getAll("teacherIds")
      .map(String)
      .filter(Boolean);

    const schoolClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!schoolClass)
      return {
        success: false,
        error:   "Selected class does not belong to your school.",
      };

    if (!(await validateTeachers(teacherProfileIds, schoolId)))
      return {
        success: false,
        error:   "One or more selected teachers do not belong to your school.",
      };

    // Transaction: wipe old teacher links then rebuild
    await prisma.$transaction(async (tx) => {
      await tx.teacherSubject.deleteMany({ where: { subjectId: id } });

      await tx.subject.update({
        where: { id },
        data:  { name: name.trim(), code: code?.trim() || null, classId },
      });

      if (teacherProfileIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: teacherProfileIds.map((tpId) => ({
            teacherProfileId: tpId,
            subjectId:        id,
          })),
        });
      }
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "A subject with this name already exists in the selected class.",
        fieldErrors: { name: ["Name must be unique within a class."] },
      };
    }
    console.error("[updateSubject]", e);
    return { success: false, error: "Failed to update subject." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────
export async function deleteSubject(id: string): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Subject not found." };

    await prisma.subject.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteSubject]", e);
    return { success: false, error: "Failed to delete subject." };
  }
}