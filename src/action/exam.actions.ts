"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ExamType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ExamSchema } from "@/lib/validations/exam";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import { NOTIFICATION_TYPES, notifyMany } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import {
  examNotificationEmail,
  examNotificationSubject,
} from "@/lib/email-templates/exam-notification";

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
    _notifyStudentsOfExam({
      schoolId,
      classId,
      examId: createdExam.id,
      examName: name.trim(),
      examType,
      className: schoolClass.name,
      startDate: startDate,
      endDate: endDate,
      createdByName: user.name ?? "Admin",
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        success: false,
        error: "An exam with this name already exists for this class.",
        fieldErrors: { name: ["Name must be unique within a class."] },
      };
    }
    console.error("[createExam]", e);
    return { success: false, error: "Failed to create exam." };
  }
}

async function _notifyStudentsOfExam(args: {
  schoolId: string;
  classId: string;
  examId: string;
  examName: string;
  examType: string;
  className: string;
  startDate?: string;
  endDate?: string;
  createdByName: string;
}): Promise<void> {
  try {
    const school = await prisma.school.findUnique({
      where: { id: args.schoolId },
      select: { name: true },
    });
    if (!school) return;

    // Get all students in this class
    const students = await prisma.studentProfile.findMany({
      where: {
        section: { classId: args.classId },
        user: { schoolId: args.schoolId, isActive: true },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const formatDate = (d?: string) => {
      if (!d) return null;
      return new Date(`${d}T00:00:00.000Z`).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });
    };

    for (const student of students) {
      if (!student.user.email) continue;

      sendEmail({
        to: student.user.email,
        subject: examNotificationSubject(args.examName, args.className),
        html: examNotificationEmail({
          schoolName: school.name,
          recipientName: student.user.name,
          examName: args.examName,
          examType: args.examType,
          className: args.className,
          startDate: formatDate(args.startDate),
          endDate: formatDate(args.endDate),
          createdByName: args.createdByName,
        }),
      });
    }

    notifyMany(
      students
        .filter((s) => !!s.user.email)
        .map((s) => ({
          userId: s.user.id,
          schoolId: args.schoolId,
        })),
      {
        title: `New exam scheduled: ${args.examName}`,
        body: `${args.examType.replace("_", " ")} for ${args.className}${args.startDate ? ` — starts ${formatDate(args.startDate)}` : ""
          }`,
        link: "/student/results",
      },
    );
  } catch (err) {
    console.error("[exam email] Failed:", err);
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
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.exam.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Exam not found." };

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

    if (classId !== existing.classId) {
      const resultCount = await prisma.result.count({ where: { examId: id } });
      if (resultCount > 0) {
        return {
          success: false,
          error: `Cannot change class — ${resultCount} result(s) already exist.`,
        };
      }
    }

    await prisma.exam.update({
      where: { id },
      data: {
        name: name.trim(),
        examType,
        classId,
        startDate: toDateOrNull(startDate),
        endDate: toDateOrNull(endDate),
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        success: false,
        error: "An exam with this name already exists for this class.",
        fieldErrors: { name: ["Name must be unique within a class."] },
      };
    }
    console.error("[updateExam]", e);
    return { success: false, error: "Failed to update exam." };
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const existing = await prisma.exam.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Exam not found." };

    await prisma.exam.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deleteExam]", e);
    return { success: false, error: "Failed to delete exam." };
  }
}

// await safelyLogAction({
//       userId: user.id,
//       userRole: user.role,
//       userName: user.name ?? "Unknown",
//       schoolId,
//       action: AUDIT_ACTIONS.DELETE_EXAM,
//       entity: "Exam",
//       entityId: existing.id,
//       entityName: existing.name,
//       metadata: {
//         examType: existing.examType,
//         classId: existing.classId,
//         className: existing.class.name,
//         startDate:
//           existing.startDate?.toISOString() ??
//           null,
//         endDate:
//           existing.endDate?.toISOString() ??
//           null,
//         academicYearId:
//           existing.academicYearId,
//       },
//     });

//     revalidateExamPages();
//     {
//     return {
//       success: true,
//       message: "Exam deleted successfully.",
//     };
//   } catch (error) {
//     console.error("[deleteExam]", error);

//     return {
//       success: false,
//       error: "Failed to delete exam.",
//     };
//   }
