"use server";

import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { revalidatePath }     from "next/cache";
import { PeriodSchema }       from "@/lib/validations/timetable";
import type { ActionResult }  from "@/types/actions";
import type { DayOfWeek } from "@prisma/client";
import { create } from "domain";

const REVALIDATE = "/school-admin/timetable";

// ─────────────────────────────────────────────────────────────────
// UPSERT PERIOD  (create or update a single timetable slot)
// ─────────────────────────────────────────────────────────────────
export async function upsertPeriod(raw: unknown): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned to your account." };

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

    // ── Section must belong to this school ───────────────────────
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
    });
    if (!section)
      return { success: false, error: "Section not found in your school." };

    // ── If subject provided, must belong to section's class ──────
    if (subjectId) {
      const sub = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId, classId: section.classId },
      });
      if (!sub)
        return { success: false, error: "Subject does not belong to this section's class." };
    }

    // ── If teacher provided, must belong to this school ──────────
    if (teacherProfileId) {
      const tp = await prisma.teacherProfile.findFirst({
        where: { id: teacherProfileId, user: { schoolId } },
      });
      if (!tp)
        return { success: false, error: "Teacher not found in your school." };
    }

    if (teacherProfileId) {
  const teacherConflict = await prisma.period.findFirst({
    where: {
      schoolId,
      teacherProfileId,
      dayOfWeek: dayOfWeek as DayOfWeek,
      periodNumber,
      NOT: {
        sectionId,
      },
    },
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  });

  if (teacherConflict) {
    return {
      success: false,
      error: `This teacher is already assigned to ${teacherConflict.section.class.name} - Section ${teacherConflict.section.name} in the same time slot.`,
    };
  }
}

    await prisma.period.upsert({
      where: {
        sectionId_dayOfWeek_periodNumber: {
          sectionId,
          dayOfWeek: dayOfWeek as DayOfWeek,
          periodNumber,
        },
      },
      create: {
        schoolId,
        sectionId,
        dayOfWeek:        dayOfWeek as DayOfWeek,
        periodNumber,
        subjectId:        subjectId        || null,
        teacherProfileId: teacherProfileId || null,
        startTime:        startTime        || null,
        endTime:          endTime          || null,
      },
      update: {
        subjectId:        subjectId        || null,
        teacherProfileId: teacherProfileId || null,
        startTime:        startTime        || null,
        endTime:          endTime          || null,
      },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[upsertPeriod]", e);
    return { success: false, error: "Failed to save period." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE PERIOD  (clear a timetable slot)
// ─────────────────────────────────────────────────────────────────
export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = user.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const period = await prisma.period.findFirst({ where: { id, schoolId } });
    if (!period) return { success: false, error: "Period not found." };

    await prisma.period.delete({ where: { id } });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[deletePeriod]", e);
    return { success: false, error: "Failed to delete period." };
  }
}