"use server";

import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { revalidatePath }     from "next/cache";
import { PeriodSchema }       from "@/lib/validations/timetable";
import type { ActionResult }  from "@/types/actions";
import type { DayOfWeek }     from "@prisma/client";

const REVALIDATE = "/school-admin/timetable";

// ── Get current academic year for a school ────────────────────────
async function getCurrentYearId(
  schoolId: string,
): Promise<string | null> {
  const y = await prisma.academicYear.findFirst({
    where:  { schoolId, isCurrent: true },
    select: { id: true },
  });
  return y?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────
// UPSERT PERIOD
// ─────────────────────────────────────────────────────────────────

export async function upsertPeriod(raw: unknown): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const parsed = PeriodSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success:     false,
        error:       "Invalid data.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      sectionId,
      dayOfWeek,
      periodNumber,
      subjectId,
      teacherProfileId,
      startTime,
      endTime,
    } = parsed.data;

    // Section must belong to this school
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
    });
    if (!section)
      return { success: false, error: "Section not found in your school." };

    // Subject validation
    if (subjectId) {
      const sub = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId, classId: section.classId },
      });
      if (!sub)
        return { success: false, error: "Subject doesn't belong to this class." };
    }

    // Teacher validation
    if (teacherProfileId) {
      const tp = await prisma.teacherProfile.findFirst({
        where: { id: teacherProfileId, user: { schoolId } },
      });
      if (!tp)
        return { success: false, error: "Teacher not found in your school." };
    }

    // Get current academic year (null = legacy mode)
    const currentYearId = await getCurrentYearId(schoolId);

    const createData = {
      schoolId,
      sectionId,
      dayOfWeek:       dayOfWeek as DayOfWeek,
      periodNumber,
      subjectId:       subjectId        || null,
      teacherProfileId: teacherProfileId || null,
      startTime:       startTime        || null,
      endTime:         endTime          || null,
      academicYearId:  currentYearId,  // null when no year set
    };

    const updateData = {
      subjectId:       subjectId        || null,
      teacherProfileId: teacherProfileId || null,
      startTime:       startTime        || null,
      endTime:         endTime          || null,
      academicYearId:  currentYearId,  // null when no year set
    };

    if (currentYearId) {
      // Year-scoped upsert — unique constraint includes academicYearId
      await prisma.period.upsert({
        where: {
          sectionId_dayOfWeek_periodNumber: {
            sectionId,
            dayOfWeek:    dayOfWeek  as DayOfWeek,
            periodNumber,
          },
        },
        create: createData,
        update: updateData,
      });
    } else {
      // Legacy mode — NULL academicYearId, use findFirst + create/update
      const existing = await prisma.period.findFirst({
        where: {
          sectionId,
          dayOfWeek:     dayOfWeek as DayOfWeek,
          periodNumber,
          academicYearId: null,
        },
      });

      if (existing) {
        await prisma.period.update({
          where: { id: existing.id },
          data:  updateData,
        });
      } else {
        await prisma.period.create({ data: createData });
      }
    }

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[upsertPeriod]", e);
    return { success: false, error: "Failed to save period." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE PERIOD
// ─────────────────────────────────────────────────────────────────

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "No school assigned." };

    const period = await prisma.period.findFirst({
      where: { id, schoolId },
    });
    if (!period) return { success: false, error: "Period not found." };

    await prisma.period.delete({ where: { id } });
    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deletePeriod]", e);
    return { success: false, error: "Failed to delete period." };
  }
}
