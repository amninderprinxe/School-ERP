"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { TeacherSchema } from "@/lib/validations/teachers";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

const DEFAULT_PASSWORD = "Password@123";
const REVALIDATE = "/school-admin/teachers";

function parseGender(value?: string) {
  if (
    value === "MALE" ||
    value === "FEMALE" ||
    value === "OTHER"
  ) {
    return value;
  }

  return null;
}

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[teacher-audit-log]", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// CREATE TEACHER
// ─────────────────────────────────────────────────────────────────

export async function createTeacher(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school is assigned to your account.",
      };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = TeacherSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      email,
      gender,
      phone,
      employeeCode,
      qualification,
      joiningDate,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanEmployeeCode =
      employeeCode?.trim() || null;

    const hashedPassword = await bcrypt.hash(
      DEFAULT_PASSWORD,
      10,
    );

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: "TEACHER",
        gender: parseGender(gender),
        phone: phone?.trim() || null,
        schoolId,
        isActive: true,

        teacherProfile: {
          create: {
            employeeCode: cleanEmployeeCode,
            qualification:
              qualification?.trim() || null,
            joiningDate: joiningDate
              ? new Date(joiningDate)
              : null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_TEACHER,
      entity: "Teacher",
      entityId: newUser.id,
      entityName: newUser.name,
      metadata: {
        email: newUser.email,
        employeeCode: cleanEmployeeCode,
      },
    });

    revalidatePath(REVALIDATE);
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A user with this email already exists.",
        fieldErrors: {
          email: ["Email is already registered."],
        },
      };
    }

    console.error("[createTeacher]", error);

    return {
      success: false,
      error: "Failed to create teacher.",
    };
  }

  redirect(REVALIDATE);
}

// ─────────────────────────────────────────────────────────────────
// UPDATE TEACHER
// ─────────────────────────────────────────────────────────────────

export async function updateTeacher(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.user.findFirst({
      where: {
        id,
        schoolId,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Teacher not found.",
      };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = TeacherSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      email,
      gender,
      phone,
      employeeCode,
      qualification,
      joiningDate,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanEmployeeCode =
      employeeCode?.trim() || null;

    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name: cleanName,
        email: cleanEmail,
        gender: parseGender(gender),
        phone: phone?.trim() || null,

        teacherProfile: {
          update: {
            employeeCode: cleanEmployeeCode,
            qualification:
              qualification?.trim() || null,
            joiningDate: joiningDate
              ? new Date(joiningDate)
              : null,
          },
        },
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_TEACHER,
      entity: "Teacher",
      entityId: existing.id,
      entityName: cleanName,
      metadata: {
        email: cleanEmail,
        previousEmail: existing.email,
        previousName: existing.name,
        employeeCode: cleanEmployeeCode,
      },
    });

    revalidatePath(REVALIDATE);
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A user with this email already exists.",
        fieldErrors: {
          email: ["Email is already registered."],
        },
      };
    }

    console.error("[updateTeacher]", error);

    return {
      success: false,
      error: "Failed to update teacher.",
    };
  }

  redirect(REVALIDATE);
}

// ─────────────────────────────────────────────────────────────────
// DELETE TEACHER
// ─────────────────────────────────────────────────────────────────

export async function deleteTeacher(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.user.findFirst({
      where: {
        id,
        schoolId,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacherProfile: {
          select: {
            employeeCode: true,
          },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Teacher not found.",
      };
    }

    await prisma.user.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_TEACHER,
      entity: "Teacher",
      entityId: existing.id,
      entityName: existing.name,
      metadata: {
        email: existing.email,
        employeeCode:
          existing.teacherProfile?.employeeCode ?? null,
      },
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message: "Teacher deleted successfully.",
    };
  } catch (error) {
    console.error("[deleteTeacher]", error);

    return {
      success: false,
      error: "Failed to delete teacher.",
    };
  }
}
