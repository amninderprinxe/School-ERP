"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { StudentSchema } from "@/lib/validations/student";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const DEFAULT_PASSWORD = "Password@123";
const REVALIDATE = "/school-admin/students";

function parseGender(value?: string) {
  if (value === "MALE" || value === "FEMALE" || value === "OTHER") return value;
  return null;
}

export async function createStudent(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school is assigned to your account." };

    const raw = Object.fromEntries(formData.entries());
    const parsed = StudentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, email, gender, phone, rollNumber, admissionNo, dateOfBirth, bloodGroup, sectionId } = parsed.data;

    if (sectionId) {
      const sec = await prisma.section.findFirst({ where: { id: sectionId, schoolId } });
      if (!sec) return { success: false, error: "Selected section does not belong to your school." };
    }

    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await prisma.user.create({
      data: {
        name:     name.trim(),
        email:    email.toLowerCase().trim(),
        password: hashed,
        role:     "STUDENT",
        gender:   parseGender(gender),
        phone:    phone?.trim() || null,
        schoolId,
        studentProfile: {
          create: {
            rollNumber:  rollNumber?.trim()  || null,
            admissionNo: admissionNo?.trim() || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            bloodGroup:  bloodGroup?.trim()  || null,
            sectionId:   sectionId           || null,
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
    console.error("[createStudent]", e);
    return { success: false, error: "Failed to create student. Please try again." };
  }
}

export async function updateStudent(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school is assigned to your account." };

    const existing = await prisma.user.findFirst({ where: { id, schoolId, role: "STUDENT" } });
    if (!existing) return { success: false, error: "Student not found." };

    const raw = Object.fromEntries(formData.entries());
    const parsed = StudentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { name, email, gender, phone, rollNumber, admissionNo, dateOfBirth, bloodGroup, sectionId } = parsed.data;

    if (sectionId) {
      const sec = await prisma.section.findFirst({ where: { id: sectionId, schoolId } });
      if (!sec) return { success: false, error: "Selected section does not belong to your school." };
    }

    await prisma.user.update({
      where: { id },
      data: {
        name:   name.trim(),
        email:  email.toLowerCase().trim(),
        gender: parseGender(gender),
        phone:  phone?.trim() || null,
        studentProfile: {
          update: {
            rollNumber:  rollNumber?.trim()  || null,
            admissionNo: admissionNo?.trim() || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            bloodGroup:  bloodGroup?.trim()  || null,
            sectionId:   sectionId           || null,
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
    console.error("[updateStudent]", e);
    return { success: false, error: "Failed to update student." };
  }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.user.findFirst({ where: { id, schoolId, role: "STUDENT" } });
    if (!existing) return { success: false, error: "Student not found." };

    await prisma.user.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteStudent]", e);
    return { success: false, error: "Failed to delete student." };
  }
}