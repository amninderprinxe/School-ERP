"use server";

import { revalidatePath } from "next/cache";
import { sendResultEmail } from "@/lib/email";
import { calcPercentage } from "@/lib/results-utils";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  SaveResultsSchema,
  type SaveResultsInput,
} from "@/lib/validations/results";
import { calcGrade } from "@/lib/results-utils";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import { notifyStudentAndParents, NOTIFICATION_TYPES } from "@/lib/notify";
import type { ActionResult } from "@/types/actions";

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

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[result-audit-log]", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// SAVE RESULTS — TEACHER ONLY
// ─────────────────────────────────────────────────────────────────

export async function saveResults(
  data: SaveResultsInput,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["TEACHER"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    const parsed = SaveResultsSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error:
          "Invalid data submitted. Please check your entries.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const {
      examId,
      subjectId,
      sectionId,
      entries,
    } = parsed.data;

    if (entries.length === 0) {
      return {
        success: false,
        error: "No result entries were submitted.",
      };
    }

    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        classId: true,
        academicYearId: true,
      },
    });

    if (!exam) {
      return {
        success: false,
        error: "Exam not found in your school.",
      };
    }

    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
        classId: exam.classId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        classId: true,
      },
    });

    if (!subject) {
      return {
        success: false,
        error:
          "Subject does not belong to this exam's class.",
      };
    }

    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
        classId: exam.classId,
      },
      select: {
        id: true,
        name: true,
        classId: true,
      },
    });

    if (!section) {
      return {
        success: false,
        error:
          "Section does not belong to this exam's class.",
      };
    }

    const teacherProfile =
      await prisma.teacherProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

    if (!teacherProfile) {
      return {
        success: false,
        error: "Teacher profile not found.",
      };
    }

    const teacherSubjectAssignment =
      await prisma.teacherSubject.findFirst({
        where: {
          teacherProfileId: teacherProfile.id,
          subjectId,
          subject: {
            schoolId,
            classId: exam.classId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!teacherSubjectAssignment) {
      return {
        success: false,
        error:
          "You are not assigned to this subject. Contact your school admin.",
      };
    }

    const studentIds = entries.map(
      (entry) => entry.studentProfileId,
    );

    const uniqueStudentIds = [
      ...new Set(studentIds),
    ];

    if (uniqueStudentIds.length !== entries.length) {
      return {
        success: false,
        error:
          "Duplicate student entries were submitted.",
      };
    }

    const validCount =
      await prisma.studentProfile.count({
        where: {
          id: {
            in: uniqueStudentIds,
          },
          sectionId,
          user: {
            schoolId,
            isActive: true,
          },
        },
      });

    if (validCount !== entries.length) {
      return {
        success: false,
        error:
          "Some students do not belong to this section. Refresh and try again.",
      };
    }

    await prisma.$transaction(
      entries.map((entry) => {
        const grade =
          entry.grade?.trim() ||
          calcGrade(
            entry.marksObtained,
            entry.maxMarks,
          );

        return prisma.result.upsert({
          where: {
            examId_studentProfileId_subjectId: {
              examId,
              studentProfileId:
                entry.studentProfileId,
              subjectId,
            },
          },

          create: {
            marksObtained:
              entry.marksObtained,
            maxMarks: entry.maxMarks,
            grade: grade || null,
            remarks:
              entry.remarks?.trim() || null,
            schoolId,
            examId,
            studentProfileId:
              entry.studentProfileId,
            subjectId,
          },

          update: {
            marksObtained:
              entry.marksObtained,
            maxMarks: entry.maxMarks,
            grade: grade || null,
            remarks:
              entry.remarks?.trim() || null,
          },
        });
      }),
    );


    for (const entry of entries) {
      void notifyStudentAndParents(entry.studentProfileId, {
        title: "Marks have been entered",
        body: `Your results for ${subject.name} are available.`,
        link: "/student/results",
        type: NOTIFICATION_TYPES.RESULT_PUBLISHED,
        schoolId,
      });
    }

    void (async () => {
      try {
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
        const school = await prisma.school.findUnique({
          where: { id: schoolId }, select: { name: true },
        });
        for (const entry of entries) {
          const sp = await prisma.studentProfile.findUnique({
            where: { id: entry.studentProfileId },
            include: {
              user: { select: { email: true, name: true } },
              parents: {
                include: {
                  parentProfile: {
                    include: { user: { select: { email: true, name: true } } },
                  },
                },
              },
            },
          });
          if (!sp) continue;
          const pct = calcPercentage(entry.marksObtained, entry.maxMarks);
          const data = {
            schoolName: school?.name ?? "School",
            studentName: sp.user.name,
            examName: exam.name,
            subjectName: subject.name,
            marksObtained: entry.marksObtained,
            maxMarks: entry.maxMarks,
            grade: entry.grade?.trim() || calcGrade(entry.marksObtained, entry.maxMarks),
            percentage: pct,
            loginUrl,
          };
          // Notify student
          sendResultEmail(sp.user.email, { ...data, recipientName: sp.user.name });
          // Notify linked parents
          for (const ps of sp.parents) {
            const parent = ps.parentProfile.user;
            sendResultEmail(parent.email, { ...data, recipientName: parent.name });
          }
        }
      } catch (err) {
        console.error("[result email]", err);
      }
    })();

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.SAVE_RESULTS,
      entity: "Result",
      entityId: exam.id,
      entityName: subject.name,
      metadata: {
        examId: exam.id,
        examName: exam.name,
        subjectId: subject.id,
        subjectCode: subject.code,
        sectionId: section.id,
        sectionName: section.name,
        classId: exam.classId,
        academicYearId:
          exam.academicYearId,
        count: entries.length,
      },
    });

    revalidatePath("/teacher/results");
    revalidatePath("/school-admin/results");
    revalidatePath("/student/results");
    revalidatePath("/parent/results");

    return {
      success: true,
      message: `${entries.length} result record(s) saved successfully.`,
    };
  } catch (error) {
    console.error("[saveResults]", error);

    return {
      success: false,
      error:
        "Failed to save results. Please try again.",
    };
  }
}
