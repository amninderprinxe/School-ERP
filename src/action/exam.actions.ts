"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ExamType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ExamSchema } from "@/lib/validations/exam";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import { notifyClass, NOTIFICATION_TYPES } from "@/lib/notify";
import { sendExamEmail } from "@/lib/email";

import type { ActionResult } from "@/types/actions";

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  UNIT_TEST: "Unit Test",
  MID_TERM: "Mid Term",
  FINAL: "Final Exam",
  ASSIGNMENT: "Assignment",
  PRACTICAL: "Practical",
  OTHER: "Other",
};

const REVALIDATE = "/school-admin/exams";

function toDateOrNull(
  value: string | undefined,
): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(
    `${value.trim()}T00:00:00.000Z`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

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

async function getCurrentAcademicYearId(
  schoolId: string,
): Promise<string | null> {
  const academicYear =
    await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        isClosed: false,
      },
      select: {
        id: true,
      },
    });

  return academicYear?.id ?? null;
}

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[exam-audit-log]", error);
  }
}

function revalidateExamPages() {
  revalidatePath(REVALIDATE);
  revalidatePath("/school-admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/parent");
}

// ─────────────────────────────────────────────────────────────────
// CREATE EXAM
// ─────────────────────────────────────────────────────────────────

export async function createExam(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error:
          "No school assigned to your account.",
      };
    }

    const parsed = ExamSchema.safeParse({
      name: formData.get("name"),
      examType: formData.get("examType"),
      classId: formData.get("classId"),
      startDate:
        formData.get("startDate") || undefined,
      endDate:
        formData.get("endDate") || undefined,
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
      examType,
      classId,
      startDate,
      endDate,
    } = parsed.data;

    const cleanName = name.trim();

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

    const academicYearId =
      await getCurrentAcademicYearId(schoolId);

    const createdExam =
      await prisma.exam.create({
        data: {
          name: cleanName,
          examType,
          schoolId,
          classId,
          createdById: user.id,
          startDate: toDateOrNull(startDate),
          endDate: toDateOrNull(endDate),
          academicYearId,
        },
        select: {
          id: true,
          name: true,
          examType: true,
          classId: true,
          startDate: true,
          endDate: true,
          academicYearId: true,
        },
      });

    void notifyClass(
      classId,
      schoolId,
      {
        title: `New Exam: ${name.trim()}`,
        body: `${EXAM_TYPE_LABELS[examType]} for ${schoolClass.name}`,
        link: "/student/results",
        type: NOTIFICATION_TYPES.EXAM_CREATED,
        schoolId,
      },
    );

    void (async () => {
      try {
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
        const school = await prisma.school.findUnique({
          where: { id: schoolId }, select: { name: true },
        });
        // Students in this class
        const students = await prisma.user.findMany({
          where: {
            schoolId,
            isActive: true,
            studentProfile: { section: { classId } },
          },
          select: { email: true, name: true },
        });
        for (const s of students) {
          sendExamEmail(s.email, {
            schoolName: school?.name ?? "School",
            recipientName: s.name,
            examName: name.trim(),
            examType: EXAM_TYPE_LABELS[examType] ?? examType,
            className: schoolClass.name,
            startDate: toDateOrNull(startDate),
            endDate: toDateOrNull(endDate),
            loginUrl,
          });
        }
      } catch (err) {
        console.error("[exam email]", err);
      }
    })();

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_EXAM,
      entity: "Exam",
      entityId: createdExam.id,
      entityName: createdExam.name,
      metadata: {
        examType: createdExam.examType,
        classId: createdExam.classId,
        className: schoolClass.name,
        startDate:
          createdExam.startDate?.toISOString() ??
          null,
        endDate:
          createdExam.endDate?.toISOString() ??
          null,
        academicYearId:
          createdExam.academicYearId,
      },
    });

    revalidateExamPages();

    return {
      success: true,
      message: "Exam created successfully.",
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
          "An exam with this name already exists for this class.",
        fieldErrors: {
          name: [
            "Name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[createExam]", error);

    return {
      success: false,
      error:
        "Failed to create exam. Please try again.",
    };
  }
}



// ─────────────────────────────────────────────────────────────────
// UPDATE EXAM
// ─────────────────────────────────────────────────────────────────

export async function updateExam(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error:
          "No school assigned to your account.",
      };
    }

    const existing =
      await prisma.exam.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          examType: true,
          classId: true,
          startDate: true,
          endDate: true,
          academicYearId: true,
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
      startDate:
        formData.get("startDate") || undefined,
      endDate:
        formData.get("endDate") || undefined,
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
      examType,
      classId,
      startDate,
      endDate,
    } = parsed.data;

    const cleanName = name.trim();

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

    if (classId !== existing.classId) {
      const resultCount =
        await prisma.result.count({
          where: {
            examId: existing.id,
          },
        });

      if (resultCount > 0) {
        return {
          success: false,
          error:
            `Cannot change class — this exam already has ` +
            `${resultCount} result record(s). Delete the results first.`,
        };
      }
    }

    const updatedExam =
      await prisma.exam.update({
        where: {
          id: existing.id,
        },
        data: {
          name: cleanName,
          examType,
          classId,
          startDate: toDateOrNull(startDate),
          endDate: toDateOrNull(endDate),
        },
        select: {
          id: true,
          name: true,
          examType: true,
          classId: true,
          startDate: true,
          endDate: true,
          academicYearId: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_EXAM,
      entity: "Exam",
      entityId: updatedExam.id,
      entityName: updatedExam.name,
      metadata: {
        examType: updatedExam.examType,
        classId: updatedExam.classId,
        className: schoolClass.name,
        startDate:
          updatedExam.startDate?.toISOString() ??
          null,
        endDate:
          updatedExam.endDate?.toISOString() ??
          null,
        academicYearId:
          updatedExam.academicYearId,

        previousName: existing.name,
        previousExamType: existing.examType,
        previousClassId: existing.classId,
        previousStartDate:
          existing.startDate?.toISOString() ??
          null,
        previousEndDate:
          existing.endDate?.toISOString() ??
          null,
      },
    });

    revalidateExamPages();

    return {
      success: true,
      message: "Exam updated successfully.",
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
          "An exam with this name already exists for this class.",
        fieldErrors: {
          name: [
            "Name must be unique within a class.",
          ],
        },
      };
    }

    console.error("[updateExam]", error);

    return {
      success: false,
      error: "Failed to update exam.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE EXAM
// ─────────────────────────────────────────────────────────────────

export async function deleteExam(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing =
      await prisma.exam.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          examType: true,
          classId: true,
          startDate: true,
          endDate: true,
          academicYearId: true,
          class: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              results: true,
            },
          },
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "Exam not found.",
      };
    }

    /*
     * Existing Prisma schema uses onDelete: Cascade
     * from Exam to Result. Blocking here prevents
     * accidental deletion of entered marks.
     */
    if (existing._count.results > 0) {
      return {
        success: false,
        error:
          `This exam cannot be deleted because it has ` +
          `${existing._count.results} result record(s).`,
      };
    }

    await prisma.exam.delete({
      where: {
        id: existing.id,
      },
    });



    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_EXAM,
      entity: "Exam",
      entityId: existing.id,
      entityName: existing.name,
      metadata: {
        examType: existing.examType,
        classId: existing.classId,
        className: existing.class.name,
        startDate:
          existing.startDate?.toISOString() ??
          null,
        endDate:
          existing.endDate?.toISOString() ??
          null,
        academicYearId:
          existing.academicYearId,
      },
    });

    revalidateExamPages();

    return {
      success: true,
      message: "Exam deleted successfully.",
    };
  } catch (error) {
    console.error("[deleteExam]", error);

    return {
      success: false,
      error: "Failed to delete exam.",
    };
  }
}
