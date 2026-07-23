"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  SaveAttendanceSchema,
  type SaveAttendanceInput,
} from "@/lib/validations/attendance";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

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
    console.error("[attendance-audit-log]", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// SAVE ATTENDANCE
// Creates or updates attendance records.
//
// Called from a client component and receives a plain object.
// ─────────────────────────────────────────────────────────────────

export async function saveAttendance(
  data: SaveAttendanceInput,
): Promise<ActionResult> {
  try {
    const user = await requireRole([
      "TEACHER",
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
      };
    }

    // ── Validate request data ─────────────────────────────────────

    const parsed = SaveAttendanceSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid attendance data. Please try again.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const {
      sectionId,
      date,
      entries,
    } = parsed.data;

    if (entries.length === 0) {
      return {
        success: false,
        error: "No attendance entries were submitted.",
      };
    }

    // Store @db.Date consistently at midnight UTC.
    const attendanceDate = new Date(
      `${date}T00:00:00.000Z`,
    );

    if (Number.isNaN(attendanceDate.getTime())) {
      return {
        success: false,
        error: "Invalid attendance date.",
      };
    }

    // ── Verify section ownership ──────────────────────────────────

    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        classId: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!section) {
      return {
        success: false,
        error: "Section not found in your school.",
      };
    }

    // ── Verify teacher access ─────────────────────────────────────

    if (user.role === "TEACHER") {
      const teacherProfile =
        await prisma.teacherProfile.findUnique({
          where: {
            userId: user.id,
          },
          select: {
            id: true,

            classTeacherOf: {
              where: {
                id: sectionId,
              },
              select: {
                id: true,
              },
            },

            subjects: {
              where: {
                subject: {
                  schoolId,
                  classId: section.classId,
                },
              },
              select: {
                id: true,
              },
            },
          },
        });

      if (!teacherProfile) {
        return {
          success: false,
          error: "Teacher profile not found.",
        };
      }

      const isClassTeacher =
        teacherProfile.classTeacherOf.length > 0;

      const teachesInClass =
        teacherProfile.subjects.length > 0;

      if (!isClassTeacher && !teachesInClass) {
        return {
          success: false,
          error:
            "You are not assigned to this section or its class.",
        };
      }
    }

    // ── Reject duplicate student entries ─────────────────────────

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
          "Duplicate student attendance entries were submitted.",
      };
    }

    // ── Verify every student belongs to section and school ────────

    const validStudents =
      await prisma.studentProfile.findMany({
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
        select: {
          id: true,
        },
      });

    if (validStudents.length !== entries.length) {
      return {
        success: false,
        error:
          "Some students do not belong to this section. Refresh and try again.",
      };
    }

    // ── Create or update attendance in one transaction ───────────

    await prisma.$transaction(
      entries.map((entry) =>
        prisma.attendance.upsert({
          where: {
            studentProfileId_date: {
              studentProfileId:
                entry.studentProfileId,
              date: attendanceDate,
            },
          },

          create: {
            date: attendanceDate,
            status: entry.status,
            remarks:
              entry.remarks?.trim() || null,
            schoolId,
            studentProfileId:
              entry.studentProfileId,
            sectionId,
            markedById: user.id,
          },

          update: {
            status: entry.status,
            remarks:
              entry.remarks?.trim() || null,
            sectionId,
            markedById: user.id,
          },
        }),
      ),
    );

    // ── Audit log ─────────────────────────────────────────────────

    const statusSummary = entries.reduce<
      Record<string, number>
    >((summary, entry) => {
      summary[entry.status] =
        (summary[entry.status] ?? 0) + 1;

      return summary;
    }, {});

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.MARK_ATTENDANCE,
      entity: "Attendance",
      entityId: section.id,
      entityName: section.id,
      metadata: {
        date,
        sectionId: section.id,
        sectionName: section.name,
        classId: section.classId,
        className: section.class.name,
        count: entries.length,
        statusSummary,
      },
    });

    // ── Revalidate related pages ──────────────────────────────────

    revalidatePath("/teacher/attendance");
    revalidatePath("/school-admin/attendance");
    revalidatePath("/student/attendance");
    revalidatePath("/parent/attendance");

    return {
      success: true,
      message: `Attendance saved for ${entries.length} student(s).`,
    };
  } catch (error) {
    console.error("[saveAttendance]", error);

    return {
      success: false,
      error:
        "Failed to save attendance. Please try again.",
    };
  }
}
