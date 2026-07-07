"use server";

import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { revalidatePath }     from "next/cache";
import {
  SaveAttendanceSchema,
  type SaveAttendanceInput,
} from "@/lib/validations/attendance";
import type { ActionResult }  from "@/types/actions";

// ─────────────────────────────────────────────────────────────────
// SAVE (create or update) ATTENDANCE
// Called from a client component — receives plain object, not FormData
// ─────────────────────────────────────────────────────────────────
export async function saveAttendance(
  data: SaveAttendanceInput,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["TEACHER", "SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    // ── Validate shape ────────────────────────────────────────────
    const parsed = SaveAttendanceSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success:     false,
        error:       "Invalid attendance data. Please try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { sectionId, date, entries } = parsed.data;

    // Always use midnight UTC so @db.Date stores consistently
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);

    // ── Section must belong to this school ────────────────────────
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
    });
    if (!section)
      return { success: false, error: "Section not found in your school." };

    // ── Teacher access check ──────────────────────────────────────
    if (user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where:   { userId: user.id },
        include: {
          classTeacherOf: { where: { id: sectionId } },
          subjects: {
            where:   { subject: { classId: section.classId } },
            include: { subject: true },
          },
        },
      });

      if (!teacherProfile)
        return { success: false, error: "Teacher profile not found." };

      const isClassTeacher  = teacherProfile.classTeacherOf.length > 0;
      const teachesInClass  = teacherProfile.subjects.length > 0;

      if (!isClassTeacher && !teachesInClass) {
        return {
          success: false,
          error:   "You are not assigned to this section or its class.",
        };
      }
    }

    // ── All students must belong to this section + school ─────────
    const studentIds    = entries.map((e) => e.studentProfileId);
    const validStudents = await prisma.studentProfile.findMany({
      where: {
        id:       { in: studentIds },
        sectionId,
        user:     { schoolId, isActive: true },
      },
      select: { id: true },
    });

    if (validStudents.length !== entries.length) {
      return {
        success: false,
        error:
          "Some students do not belong to this section. Refresh and try again.",
      };
    }

    // ── Upsert each record in a single transaction ────────────────
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.attendance.upsert({
          where: {
            studentProfileId_date: {
              studentProfileId: entry.studentProfileId,
              date:             attendanceDate,
            },
          },
          create: {
            date:             attendanceDate,
            status:           entry.status,
            remarks:          entry.remarks?.trim() || null,
            schoolId,
            studentProfileId: entry.studentProfileId,
            sectionId,
            markedById:       user.id,
          },
          update: {
            status:     entry.status,
            remarks:    entry.remarks?.trim() || null,
            markedById: user.id,
          },
        }),
      ),
    );

    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch (e) {
    console.error("[saveAttendance]", e);
    return {
      success: false,
      error:   "Failed to save attendance. Please try again.",
    };
  }
}
