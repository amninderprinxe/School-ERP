"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ExamSchema } from "@/lib/validations/exam";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@prisma/client";

const REVALIDATE = "/school-admin/exams";

function toDateOrNull(val: string | undefined): Date | null {
  if (!val || val.trim() === "") return null;

  const d = new Date(`${val}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export async function createExam(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    const parsed = ExamSchema.safeParse({
      name: formData.get("name"),
      examType: formData.get("examType"),
      classId: formData.get("classId"),
      startDate: formData.get("startDate") || undefined,
      endDate: formData.get("endDate") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, examType, classId, startDate, endDate } = parsed.data;

    const schoolClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    });

    if (!schoolClass) {
      return {
        success: false,
        error: "Selected class does not belong to your school.",
      };
    }

    await prisma.exam.create({
  data: {
    name: name.trim(),
    examType,
    school: {
      connect: { id: schoolId },
    },
    class: {
      connect: { id: classId },
    },
    createdBy: {
      connect: { id: user.id },
    },
    startDate: toDateOrNull(startDate),
    endDate: toDateOrNull(endDate),
  },
});

    revalidatePath(REVALIDATE);

    return {
      success: true,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success: false,
        error: "An exam with this name already exists for this class.",
        fieldErrors: {
          name: ["Name must be unique within a class."],
        },
      };
    }

    console.error("[createExam]", e);

    return {
      success: false,
      error: "Failed to create exam. Please try again.",
    };
  }
}

export async function updateExam(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    const existing = await prisma.exam.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Exam not found.",
      };
    }

    const parsed = ExamSchema.safeParse({
      name: formData.get("name"),
      examType: formData.get("examType"),
      classId: formData.get("classId"),
      startDate: formData.get("startDate") || undefined,
      endDate: formData.get("endDate") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, examType, classId, startDate, endDate } = parsed.data;

    const schoolClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    });

    if (!schoolClass) {
      return {
        success: false,
        error: "Selected class does not belong to your school.",
      };
    }

    if (classId !== existing.classId) {
      const resultCount = await prisma.result.count({
        where: {
          examId: id,
        },
      });

      if (resultCount > 0) {
        return {
          success: false,
          error: `Cannot change class — this exam already has ${resultCount} result record(s) entered. Delete all results first.`,
        };
      }
    }

    await prisma.exam.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        examType,
        class: {
          connect: { id: classId },
        },
        startDate: toDateOrNull(startDate),
        endDate: toDateOrNull(endDate),
      },
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success: false,
        error: "An exam with this name already exists for this class.",
        fieldErrors: {
          name: ["Name must be unique within a class."],
        },
      };
    }

    console.error("[updateExam]", e);

    return {
      success: false,
      error: "Failed to update exam.",
    };
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.exam.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Exam not found.",
      };
    }

    await prisma.exam.delete({
      where: {
        id,
      },
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
    };
  } catch (e) {
    console.error("[deleteExam]", e);

    return {
      success: false,
      error: "Failed to delete exam.",
    };
  }
}
