"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  AcademicYearSchema,
  RolloverSchema,
} from "@/lib/validations/academic-year";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

type MigrateAcademicYearResult =
  | {
      success: true;
      data: {
        migrated: number;
      };
    }
  | {
      success: false;
      error: string;
    };

type RolloverAcademicYearResult =
  | {
      success: true;
      data: {
        yearId: string;
        periodsCopied: number;
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

const REVALIDATE =
  "/school-admin/academic-years";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

async function getSchoolId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      schoolId: true,
    },
  });

  return user?.schoolId ?? null;
}

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error(
      "[academic-year-audit-log]",
      error,
    );
  }
}

function revalidateAcademicYearPages() {
  revalidatePath(REVALIDATE);
  revalidatePath("/school-admin");
  revalidatePath(
    "/school-admin/timetable",
  );
  revalidatePath("/school-admin/exams");
  revalidatePath(
    "/school-admin/fees/structures",
  );
}

// ─────────────────────────────────────────────────────────────────
// GET CURRENT ACADEMIC YEAR
// ─────────────────────────────────────────────────────────────────

export async function getCurrentAcademicYear(
  schoolId: string,
) {
  return prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isClosed: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// CREATE ACADEMIC YEAR
// ─────────────────────────────────────────────────────────────────

export async function createAcademicYear(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const parsed =
      AcademicYearSchema.safeParse({
        name: formData.get("name"),
        startDate:
          formData.get("startDate"),
        endDate: formData.get("endDate"),
        isCurrent:
          formData.get("isCurrent") ===
          "on",
      });

    if (!parsed.success) {
      return {
        success: false,
        error:
          "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten()
            .fieldErrors,
      };
    }

    const {
      name,
      startDate,
      endDate,
      isCurrent,
    } = parsed.data;

    const cleanName = name.trim();

    const createdYear =
      await prisma.$transaction(
        async (tx) => {
          if (isCurrent) {
            await tx.academicYear.updateMany({
              where: {
                schoolId,
                isCurrent: true,
              },
              data: {
                isCurrent: false,
              },
            });
          }

          return tx.academicYear.create({
            data: {
              name: cleanName,
              startDate: new Date(
                `${startDate}T00:00:00.000Z`,
              ),
              endDate: new Date(
                `${endDate}T00:00:00.000Z`,
              ),
              isCurrent,
              isClosed: false,
              schoolId,
            },
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              isClosed: true,
            },
          });
        },
      );

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS
          .CREATE_ACADEMIC_YEAR,
      entity: "AcademicYear",
      entityId: createdYear.id,
      entityName: createdYear.name,
      metadata: {
        startDate:
          createdYear.startDate.toISOString(),
        endDate:
          createdYear.endDate.toISOString(),
        isCurrent:
          createdYear.isCurrent,
        isClosed:
          createdYear.isClosed,
      },
    });

    revalidateAcademicYearPages();

    return {
      success: true,
      message:
        "Academic year created successfully.",
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
          "An academic year with this name already exists.",
        fieldErrors: {
          name: [
            "Name must be unique within your school.",
          ],
        },
      };
    }

    console.error(
      "[createAcademicYear]",
      error,
    );

    return {
      success: false,
      error:
        "Failed to create academic year.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// SET CURRENT YEAR
// ─────────────────────────────────────────────────────────────────

export async function setCurrentYear(
  id: string,
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const year =
      await prisma.academicYear.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          isClosed: true,
        },
      });

    if (!year) {
      return {
        success: false,
        error:
          "Academic year not found.",
      };
    }

    if (year.isClosed) {
      return {
        success: false,
        error:
          "A closed academic year cannot be set as current.",
      };
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.academicYear.updateMany({
          where: {
            schoolId,
            isCurrent: true,
          },
          data: {
            isCurrent: false,
          },
        });

        await tx.academicYear.update({
          where: {
            id: year.id,
          },
          data: {
            isCurrent: true,
          },
        });
      },
    );

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.SET_CURRENT_YEAR,
      entity: "AcademicYear",
      entityId: year.id,
      entityName: year.name,
      metadata: {
        previousIsCurrent:
          year.isCurrent,
        startDate:
          year.startDate.toISOString(),
        endDate:
          year.endDate.toISOString(),
      },
    });

    revalidateAcademicYearPages();

    return {
      success: true,
      message: `${year.name} is now the current academic year.`,
    };
  } catch (error) {
    console.error(
      "[setCurrentYear]",
      error,
    );

    return {
      success: false,
      error:
        "Failed to set current year.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ACADEMIC YEAR
// ─────────────────────────────────────────────────────────────────

export async function deleteAcademicYear(
  id: string,
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const year =
      await prisma.academicYear.findFirst({
        where: {
          id,
          schoolId,
        },
        include: {
          _count: {
            select: {
              exams: true,
              periods: true,
              feeStructures: true,
              attendance: true,
              studentRecords: true,
            },
          },
        },
      });

    if (!year) {
      return {
        success: false,
        error:
          "Academic year not found.",
      };
    }

    if (year.isCurrent) {
      return {
        success: false,
        error:
          "Cannot delete the current academic year. Set another year as current first.",
      };
    }

    const linkedTotal =
      year._count.exams +
      year._count.periods +
      year._count.feeStructures +
      year._count.attendance +
      year._count.studentRecords;

    if (linkedTotal > 0) {
      return {
        success: false,
        error:
          `Cannot delete — ${linkedTotal} ` +
          `linked record(s) exist.`,
      };
    }

    await prisma.academicYear.delete({
      where: {
        id: year.id,
      },
    });

    revalidateAcademicYearPages();

    return {
      success: true,
      message:
        "Academic year deleted successfully.",
    };
  } catch (error) {
    console.error(
      "[deleteAcademicYear]",
      error,
    );

    return {
      success: false,
      error:
        "Failed to delete academic year.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// MIGRATE LEGACY TIMETABLE
// Attach periods having academicYearId = null to selected year
// ─────────────────────────────────────────────────────────────────

export async function migrateTimetableToYear(
  yearId: string,
): Promise<MigrateAcademicYearResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const year =
      await prisma.academicYear.findFirst({
        where: {
          id: yearId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

    if (!year) {
      return {
        success: false,
        error:
          "Academic year not found.",
      };
    }

    const result =
      await prisma.period.updateMany({
        where: {
          schoolId,
          academicYearId: null,
        },
        data: {
          academicYearId: year.id,
        },
      });

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS
          .MIGRATE_TIMETABLE,
      entity: "AcademicYear",
      entityId: year.id,
      entityName: year.name,
      metadata: {
        yearId: year.id,
        migrated: result.count,
        startDate:
          year.startDate.toISOString(),
        endDate:
          year.endDate.toISOString(),
      },
    });

    revalidatePath(
      "/school-admin/timetable",
    );
    revalidatePath(REVALIDATE);

    return {
      success: true,
      data: {
        migrated: result.count,
      },
    };
  } catch (error) {
    console.error(
      "[migrateTimetableToYear]",
      error,
    );

    return {
      success: false,
      error:
        "Failed to migrate timetable.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// ROLLOVER ACADEMIC YEAR
//
// Current Period constraint:
// @@unique([sectionId, dayOfWeek, periodNumber])
//
// Therefore periods cannot yet be copied into another academic
// year without causing duplicate slot conflicts.
// ─────────────────────────────────────────────────────────────────

export async function rolloverAcademicYear(
  data: unknown,
): Promise<RolloverAcademicYearResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const parsed =
      RolloverSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error:
          "Please fix the errors.",
        fieldErrors:
          parsed.error.flatten()
            .fieldErrors,
      };
    }

    const {
      fromYearId,
      name,
      startDate,
      endDate,
      copyTimetable,
    } = parsed.data;

    const cleanName = name.trim();

    const sourceYear =
      await prisma.academicYear.findFirst({
        where: {
          id: fromYearId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          isClosed: true,
        },
      });

    if (!sourceYear) {
      return {
        success: false,
        error:
          "Source academic year not found.",
      };
    }

    const existingYear =
      await prisma.academicYear.findFirst({
        where: {
          schoolId,
          name: cleanName,
        },
        select: {
          id: true,
        },
      });

    if (existingYear) {
      return {
        success: false,
        error:
          `Academic year "${cleanName}" already exists.`,
      };
    }

    const newYear =
      await prisma.$transaction(
        async (tx) => {
          await tx.academicYear.updateMany({
            where: {
              schoolId,
              isCurrent: true,
            },
            data: {
              isCurrent: false,
            },
          });

          const createdYear =
            await tx.academicYear.create({
              data: {
                name: cleanName,
                startDate: new Date(
                  `${startDate}T00:00:00.000Z`,
                ),
                endDate: new Date(
                  `${endDate}T00:00:00.000Z`,
                ),
                isCurrent: true,
                isClosed: false,
                schoolId,
              },
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            });

          await tx.academicYear.update({
            where: {
              id: sourceYear.id,
            },
            data: {
              isCurrent: false,
              isClosed: true,
            },
          });

          return createdYear;
        },
      );

    const periodsCopied = 0;

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.ROLLOVER_YEAR,
      entity: "AcademicYear",
      entityId: newYear.id,
      entityName: newYear.name,
      metadata: {
        fromYearId:
          sourceYear.id,
        fromYearName:
          sourceYear.name,
        newYearId:
          newYear.id,
        newYearName:
          newYear.name,
        startDate:
          newYear.startDate.toISOString(),
        endDate:
          newYear.endDate.toISOString(),
        copyTimetableRequested:
          copyTimetable,
        periodsCopied,
        sourceYearClosed: true,
      },
    });

    revalidateAcademicYearPages();

    return {
      success: true,
      data: {
        yearId: newYear.id,
        periodsCopied,
      },
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
          "Academic year name already exists.",
      };
    }

    console.error(
      "[rolloverAcademicYear]",
      error,
    );

    return {
      success: false,
      error:
        "Rollover failed. Please try again.",
    };
  }
}