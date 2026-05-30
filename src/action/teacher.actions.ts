"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { TeacherSchema } from "@/lib/validations/teacher";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const DEFAULT_PASSWORD = "Password@123";
const REVALIDATE = "/school-admin/teachers";

function parseGender(value?: string) {
  if (value === "MALE" || value === "FEMALE" || value === "OTHER") return value;
  return null;
}

export async function createTeacher(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school is assigned to your account." };

    const raw = Object.fromEntries(formData.entries());
    const parsed = TeacherSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, email, gender, phone, employeeCode, qualification, joiningDate } = parsed.data;
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await prisma.user.create({
      data: {
        name:     name.trim(),
        email:    email.toLowerCase().trim(),
        password: hashed,
        role:     "TEACHER",
        gender:   parseGender(gender),
        phone:    phone?.trim() || null,
        schoolId,
        teacherProfile: {
          create: {
            employeeCode:  employeeCode?.trim()  || null,
            qualification: qualification?.trim() || null,
            joiningDate:   joiningDate ? new Date(joiningDate) : null,
          },
        },
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A user with this email already exists.", fieldErrors: { email: ["Email is already registered."] } };
    }
    console.error("[createTeacher]", e);
    return { success: false, error: "Failed to create teacher." };
  }
}

export async function updateTeacher(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.user.findFirst({ where: { id, schoolId, role: "TEACHER" } });
    if (!existing) return { success: false, error: "Teacher not found." };

    const raw = Object.fromEntries(formData.entries());
    const parsed = TeacherSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, email, gender, phone, employeeCode, qualification, joiningDate } = parsed.data;

    await prisma.user.update({
      where: { id },
      data: {
        name:   name.trim(),
        email:  email.toLowerCase().trim(),
        gender: parseGender(gender),
        phone:  phone?.trim() || null,
        teacherProfile: {
          update: {
            employeeCode:  employeeCode?.trim()  || null,
            qualification: qualification?.trim() || null,
            joiningDate:   joiningDate ? new Date(joiningDate) : null,
          },
        },
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "A user with this email already exists.", fieldErrors: { email: ["Email is already registered."] } };
    }
    console.error("[updateTeacher]", e);
    return { success: false, error: "Failed to update teacher." };
  }
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.user.findFirst({ where: { id, schoolId, role: "TEACHER" } });
    if (!existing) return { success: false, error: "Teacher not found." };

    await prisma.user.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteTeacher]", e);
    return { success: false, error: "Failed to delete teacher." };
  }
}