"use server";

import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { revalidatePath }     from "next/cache";
import {
  SaveResultsSchema,
  type SaveResultsInput,
}                             from "@/lib/validations/results";
import { calcGrade }          from "@/lib/results-utils";
import type { ActionResult }  from "@/types/actions";

// ─────────────────────────────────────────────────────────────────
// SAVE RESULTS — TEACHER ONLY
// ─────────────────────────────────────────────────────────────────
export async function saveResults(
  data: SaveResultsInput,
): Promise<ActionResult> {
  try {
    // ── Only TEACHER can call this action ────────────────────────
    const user     = await requireRole(["TEACHER"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

    // ── Validate payload ─────────────────────────────────────────
    const parsed = SaveResultsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success:     false,
        error:       "Invalid data submitted. Please check your entries.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { examId, subjectId, sectionId, entries } = parsed.data;

    // ── Exam must belong to this school ──────────────────────────
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
    });
    if (!exam)
      return { success: false, error: "Exam not found in your school." };

    // ── Subject must belong to exam's class + school ─────────────
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId, classId: exam.classId },
    });
    if (!subject)
      return {
        success: false,
        error:   "Subject does not belong to this exam's class.",
      };

    // ── Section must belong to exam's class + school ─────────────
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId, classId: exam.classId },
    });
    if (!section)
      return {
        success: false,
        error:   "Section does not belong to this exam's class.",
      };

    // ── Teacher profile must exist ────────────────────────────────
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
    });
    if (!teacherProfile)
      return { success: false, error: "Teacher profile not found." };

    // ── Teacher must be assigned to this subject ──────────────────
    const teacherSubjectAssignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherProfileId: teacherProfile.id,
        subjectId,
        subject: {
          schoolId,
          classId: exam.classId,
        },
      },
    });
    if (!teacherSubjectAssignment) {
      return {
        success: false,
        error:   "You are not assigned to this subject. Contact your school admin.",
      };
    }

    // ── All students must be in this section + school ─────────────
    const studentIds  = entries.map((e) => e.studentProfileId);
    const validCount  = await prisma.studentProfile.count({
      where: {
        id:        { in: studentIds },
        sectionId,
        user:      { schoolId, isActive: true },
      },
    });
    if (validCount !== entries.length) {
      return {
        success: false,
        error:
          "Some students don't belong to this section. Refresh and try again.",
      };
    }

    // ── Upsert in a single transaction ────────────────────────────
    await prisma.$transaction(
      entries.map((entry) => {
        const grade =
          entry.grade?.trim() ||
          calcGrade(entry.marksObtained, entry.maxMarks);

        return prisma.result.upsert({
          where: {
            examId_studentProfileId_subjectId: {
              examId,
              studentProfileId: entry.studentProfileId,
              subjectId,
            },
          },
          create: {
            marksObtained:    entry.marksObtained,
            maxMarks:         entry.maxMarks,
            grade:            grade || null,
            remarks:          entry.remarks?.trim() || null,
            schoolId,
            examId,
            studentProfileId: entry.studentProfileId,
            subjectId,
          },
          update: {
            marksObtained: entry.marksObtained,
            maxMarks:      entry.maxMarks,
            grade:         grade || null,
            remarks:       entry.remarks?.trim() || null,
          },
        });
      }),
    );

    revalidatePath("/teacher/results");
    revalidatePath("/school-admin/results");
    revalidatePath("/student/results");
    revalidatePath("/parent/results");

    return { success: true };
  } catch (e) {
    console.error("[saveResults]", e);
    return { success: false, error: "Failed to save results. Please try again." };
  }
}