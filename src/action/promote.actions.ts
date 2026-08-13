"use server";

import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import { revalidatePath }    from "next/cache";
import {
  PromoteStudentsSchema,
  type StudentForPromotion,
}                            from "@/lib/validations/promote";
import type { ActionResult } from "@/types/actions";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import { createNotification }       from "@/lib/notify";

// ── Fetch live schoolId ───────────────────────────────────────────
async function getSchoolId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where:  { id: userId },
    select: { schoolId: true },
  });
  return u?.schoolId ?? null;
}

// ─────────────────────────────────────────────────────────────────
// GET STUDENTS FOR PROMOTION PREVIEW
// ─────────────────────────────────────────────────────────────────

export async function getStudentsForPromotion(
  sectionId: string,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);
    if (!schoolId) return { success: false, error: "No school assigned." };

    // Verify section belongs to this school
    const section = await prisma.section.findFirst({
      where:   { id: sectionId, schoolId },
      include: { class: true },
    });
    if (!section) return { success: false, error: "Section not found." };

    const students = await prisma.studentProfile.findMany({
      where: {
        sectionId,
        user: { schoolId, isActive: true },
      },
      include: {
        user:    { select: { name: true, email: true } },
        section: { include: { class: true } },
      },
      orderBy: [{ rollNumber: "asc" }, { user: { name: "asc" } }],
    });

    const result: StudentForPromotion[] = students.map((sp) => ({
      id:           sp.id,
      name:         sp.user.name,
      email:        sp.user.email,
      rollNumber:   sp.rollNumber,
      admissionNo:  sp.admissionNo,
      sectionLabel: `${section.class.name} — Section ${section.name}`,
    }));

    return { success: true, data: result as any};
  } catch (e) {
    console.error("[getStudentsForPromotion]", e);
    return { success: false, error: "Failed to load students." };
  }
}

// ─────────────────────────────────────────────────────────────────
// EXECUTE PROMOTION
// ─────────────────────────────────────────────────────────────────

export async function promoteStudents(
  data: unknown,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);
    if (!schoolId) return { success: false, error: "No school assigned." };

    // ── Validate ─────────────────────────────────────────────────
    const parsed = PromoteStudentsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success:     false,
        error:       "Invalid data.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { studentProfileIds, targetSectionId, deactivate } = parsed.data;

    // ── Verify target section belongs to this school ──────────────
    let targetLabel: string | null = null;
    if (targetSectionId) {
      const target = await prisma.section.findFirst({
        where:   { id: targetSectionId, schoolId },
        include: { class: true },
      });
      if (!target) {
        return { success: false, error: "Target section not found in your school." };
      }
      targetLabel = `${target.class.name} — Section ${target.name}`;
    }

    // ── Verify all student profiles belong to this school ─────────
    const validCount = await prisma.studentProfile.count({
      where: {
        id:   { in: studentProfileIds },
        user: { schoolId },
      },
    });
    if (validCount !== studentProfileIds.length) {
      return {
        success: false,
        error:   "Some students do not belong to your school.",
      };
    }

    let promoted  = 0;
    let graduated = 0;

    // ── Execute in a single transaction ──────────────────────────
    await prisma.$transaction(async (tx) => {
      for (const spId of studentProfileIds) {
        if (targetSectionId) {
          // Promote to new section
          await tx.studentProfile.update({
            where: { id: spId },
            data:  { sectionId: targetSectionId },
          });
          promoted++;
        } else {
          // Graduate — remove section assignment
          await tx.studentProfile.update({
            where: { id: spId },
            data:  { sectionId: null },
          });
          // Optionally deactivate account
          if (deactivate) {
            await tx.user.updateMany({
              where: { studentProfile: { id: spId } },
              data:  { isActive: false },
            });
          }
          graduated++;
        }
      }
    });

    // ── Notify students ───────────────────────────────────────────
    _notifyStudents({
      studentProfileIds,
      schoolId,
      targetLabel,
      graduated: graduated > 0,
      deactivate,
    });

    // ── Audit ─────────────────────────────────────────────────────
    logAction({
      userId:     user.id,
      userRole:   user.role,
      userName:   user.name ?? "Admin",
      schoolId,
      action:     AUDIT_ACTIONS.UPDATE_STUDENT,
      entity:     "Student",
      entityName: targetLabel ?? "Graduated",
      metadata:   { promoted, graduated, deactivate, targetSectionId },
    });

    // Revalidate key pages
    revalidatePath("/school-admin/students");
    revalidatePath("/school-admin/promote");

    return { success: true };
  } catch (e) {
    console.error("[promoteStudents]", e);
    return { success: false, error: "Failed to promote students. Please try again." };
  }
}

// ── Fire-and-forget notifications ─────────────────────────────────

async function _notifyStudents(args: {
  studentProfileIds: string[];
  schoolId:          string;
  targetLabel:       string | null;
  graduated:         boolean;
  deactivate:        boolean;
}): Promise<void> {
  try {
    const students = await prisma.studentProfile.findMany({
      where:   { id: { in: args.studentProfileIds } },
      include: { user: { select: { id: true } } },
    });

    for (const sp of students) {
      if (args.targetLabel) {
        createNotification({
          userId:   sp.user.id,
          schoolId: args.schoolId,
          title:    "You have been promoted!",
          body:     `Welcome to ${args.targetLabel}. Check your timetable for updates.`,
          link:     "/student/timetable",
        });
      } else {
        createNotification({
          userId:   sp.user.id,
          schoolId: args.schoolId,
          title:    args.deactivate
            ? "Your school account has been deactivated"
            : "Your class assignment has been updated",
          body:     args.deactivate
            ? "Your account has been deactivated. Thank you for being a part of our school."
            : "You have been marked as graduated. Your historical records remain accessible.",
          link:     "/student",
        });
      }
    }
  } catch (err) {
    console.error("[promoteStudents notify]", err);
  }
}