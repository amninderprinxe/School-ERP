"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SectionSchema } from "@/lib/validations/section";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const REVALIDATE = "/school-admin/sections";

export async function createSection(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const parsed = SectionSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, classId, classTeacherId } = parsed.data;

    // Verify class belongs to this school
    const schoolClass = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!schoolClass) return { success: false, error: "Selected class does not belong to your school." };

    // Verify teacher belongs to this school (if provided)
    if (classTeacherId) {
      const tp = await prisma.teacherProfile.findFirst({ where: { id: classTeacherId, user: { schoolId } } });
      if (!tp) return { success: false, error: "Selected teacher does not belong to your school." };
    }

    await prisma.section.create({
      data: {
        name:            name.trim(),
        schoolId,
        classId,
        classTeacherId:  classTeacherId || null,
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A section with this name already exists in the selected class.", fieldErrors: { name: ["Section name must be unique within a class."] } };
    }
    console.error("[createSection]", e);
    return { success: false, error: "Failed to create section." };
  }
}

export async function updateSection(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.section.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Section not found." };

    const parsed = SectionSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, classId, classTeacherId } = parsed.data;

    const schoolClass = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!schoolClass) return { success: false, error: "Selected class does not belong to your school." };

    if (classTeacherId) {
      const tp = await prisma.teacherProfile.findFirst({ where: { id: classTeacherId, user: { schoolId } } });
      if (!tp) return { success: false, error: "Selected teacher does not belong to your school." };
    }

    await prisma.section.update({
      where: { id },
      data: { name: name.trim(), classId, classTeacherId: classTeacherId || null },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A section with this name already exists in the selected class.", fieldErrors: { name: ["Section name must be unique within a class."] } };
    }
    console.error("[updateSection]", e);
    return { success: false, error: "Failed to update section." };
  }
}

export async function deleteSection(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.section.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Section not found." };

    await prisma.section.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteSection]", e);
    return { success: false, error: "Failed to delete section." };
  }
}