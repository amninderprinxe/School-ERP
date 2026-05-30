"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ClassSchema } from "@/lib/validations/class";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const REVALIDATE = "/school-admin/classes";

export async function createClass(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const parsed = ClassSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await prisma.class.create({ data: { name: parsed.data.name.trim(), schoolId } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A class with this name already exists.", fieldErrors: { name: ["Name must be unique within your school."] } };
    }
    console.error("[createClass]", e);
    return { success: false, error: "Failed to create class." };
  }
}

export async function updateClass(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.class.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Class not found." };

    const parsed = ClassSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await prisma.class.update({ where: { id }, data: { name: parsed.data.name.trim() } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A class with this name already exists.", fieldErrors: { name: ["Name must be unique within your school."] } };
    }
    console.error("[updateClass]", e);
    return { success: false, error: "Failed to update class." };
  }
}

export async function deleteClass(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.class.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Class not found." };

    await prisma.class.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteClass]", e);
    return { success: false, error: "Failed to delete class. Ensure it has no dependent data." };
  }
}