"use server";

import { revalidatePath } from "next/cache";
import { PaymentMode, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { calcNewStatus } from "@/lib/fee-utils";
import { requireRole } from "@/lib/session";
import {
  FeeCategorySchema,
  FeeStructureSchema,
  RecordPaymentSchema,
} from "@/lib/validations/fee";
import type { ActionResult } from "@/types/actions";

type AssignStructureResult =
  | {
      success: true;
      data: {
        created: number;
        existing: number;
      };
    }
  | {
      success: false;
      error: string;
    };

// Fetch latest schoolId directly from the database.
async function getSchoolId(userId: string): Promise<string | null> {
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

// ─────────────────────────────────────────────────────────────────
// FEE CATEGORY
// ─────────────────────────────────────────────────────────────────

export async function createFeeCategory(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const parsed = FeeCategorySchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await prisma.feeCategory.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        schoolId,
      },
    });

    revalidatePath("/school-admin/fees/categories");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A fee category with this name already exists.",
        fieldErrors: {
          name: ["Name must be unique in your school."],
        },
      };
    }

    console.error("[createFeeCategory]", error);

    return {
      success: false,
      error: "Failed to create fee category.",
    };
  }
}

export async function updateFeeCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.feeCategory.findFirst({
      where: {
        id,
        schoolId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Fee category not found.",
      };
    }

    const parsed = FeeCategorySchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await prisma.feeCategory.update({
      where: {
        id: existing.id,
      },
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
      },
    });

    revalidatePath("/school-admin/fees/categories");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A fee category with this name already exists.",
        fieldErrors: {
          name: ["Name must be unique in your school."],
        },
      };
    }

    console.error("[updateFeeCategory]", error);

    return {
      success: false,
      error: "Failed to update fee category.",
    };
  }
}

export async function deleteFeeCategory(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.feeCategory.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        _count: {
          select: {
            feeStructures: true,
          },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Fee category not found.",
      };
    }

    if (existing._count.feeStructures > 0) {
      return {
        success: false,
        error: `Cannot delete — this category has ${existing._count.feeStructures} fee structure(s). Delete those first.`,
      };
    }

    await prisma.feeCategory.delete({
      where: {
        id: existing.id,
      },
    });

    revalidatePath("/school-admin/fees/categories");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[deleteFeeCategory]", error);

    return {
      success: false,
      error: "Failed to delete fee category.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// FEE STRUCTURE
// ─────────────────────────────────────────────────────────────────

export async function createFeeStructure(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const rawAmount = Number(formData.get("amount"));

    const parsed = FeeStructureSchema.safeParse({
      feeCategoryId: formData.get("feeCategoryId"),
      classId: formData.get("classId") || undefined,
      amount: Number.isFinite(rawAmount) ? rawAmount : undefined,
      academicYear: formData.get("academicYear"),
      dueDate: formData.get("dueDate") || undefined,
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      feeCategoryId,
      classId,
      amount,
      academicYear,
      dueDate,
      description,
    } = parsed.data;

    const category = await prisma.feeCategory.findFirst({
      where: {
        id: feeCategoryId,
        schoolId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return {
        success: false,
        error: "Fee category not found in your school.",
      };
    }

    if (classId) {
      const schoolClass = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId,
        },
        select: {
          id: true,
        },
      });

      if (!schoolClass) {
        return {
          success: false,
          error: "Class not found in your school.",
        };
      }
    }

    await prisma.feeStructure.create({
      data: {
        schoolId,
        feeCategoryId,
        classId: classId || null,
        amount,
        academicYear: academicYear.trim(),
        dueDate: dueDate
          ? new Date(`${dueDate}T00:00:00.000Z`)
          : null,
        description: description?.trim() || null,
      },
    });

    revalidatePath("/school-admin/fees/structures");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[createFeeStructure]", error);

    return {
      success: false,
      error: "Failed to create fee structure.",
    };
  }
}

export async function deleteFeeStructure(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existing = await prisma.feeStructure.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Fee structure not found.",
      };
    }

    if (existing._count.payments > 0) {
      return {
        success: false,
        error: `Cannot delete — ${existing._count.payments} payment record(s) exist. Clear payments first.`,
      };
    }

    await prisma.feeStructure.delete({
      where: {
        id: existing.id,
      },
    });

    revalidatePath("/school-admin/fees/structures");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[deleteFeeStructure]", error);

    return {
      success: false,
      error: "Failed to delete fee structure.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// ASSIGN STRUCTURE TO STUDENTS
// ─────────────────────────────────────────────────────────────────

export async function assignStructureToStudents(
  structureId: string,
): Promise<AssignStructureResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const structure = await prisma.feeStructure.findFirst({
      where: {
        id: structureId,
        schoolId,
      },
      select: {
        id: true,
        classId: true,
      },
    });

    if (!structure) {
      return {
        success: false,
        error: "Fee structure not found in your school.",
      };
    }

    const students = await prisma.studentProfile.findMany({
      where: {
        user: {
          schoolId,
          isActive: true,
        },

        ...(structure.classId
          ? {
              section: {
                classId: structure.classId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (students.length === 0) {
      return {
        success: false,
        error: "No active students found for this fee structure's class.",
      };
    }

    let created = 0;
    let existing = 0;

    for (const student of students) {
      const alreadyExists = await prisma.feePayment.findUnique({
        where: {
          studentProfileId_feeStructureId: {
            studentProfileId: student.id,
            feeStructureId: structure.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (alreadyExists) {
        existing += 1;
        continue;
      }

      await prisma.feePayment.create({
        data: {
          schoolId,
          studentProfileId: student.id,
          feeStructureId: structure.id,
          amountPaid: 0,
          waivedAmount: 0,
          status: "PENDING",
          paymentMode: "CASH",
        },
      });

      created += 1;
    }

    revalidatePath("/school-admin/fees/collect");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
      data: {
        created,
        existing,
      },
    };
  } catch (error) {
    console.error("[assignStructureToStudents]", error);

    return {
      success: false,
      error: "Failed to assign fee structure.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// RECORD PAYMENT
// ─────────────────────────────────────────────────────────────────

export async function recordPayment(
  data: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(user.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const parsed = RecordPaymentSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      studentProfileId,
      feeStructureId,
      amountPaid,
      waivedAmount,
      paymentMode,
      paymentDate,
      transactionRef,
      remarks,
    } = parsed.data;

    const structure = await prisma.feeStructure.findFirst({
      where: {
        id: feeStructureId,
        schoolId,
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (!structure) {
      return {
        success: false,
        error: "Fee structure not found in your school.",
      };
    }

    const student = await prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        user: {
          schoolId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return {
        success: false,
        error: "Student not found in your school.",
      };
    }

    const total = amountPaid + waivedAmount;

    if (total > structure.amount + 0.01) {
      return {
        success: false,
        error: `Total paid + waived (${total}) exceeds fee amount (${structure.amount}).`,
      };
    }

    const newStatus = calcNewStatus(
      structure.amount,
      amountPaid,
      waivedAmount,
    );

    await prisma.feePayment.upsert({
      where: {
        studentProfileId_feeStructureId: {
          studentProfileId,
          feeStructureId,
        },
      },

      create: {
        schoolId,
        studentProfileId,
        feeStructureId,
        amountPaid,
        waivedAmount,
        paymentDate: new Date(`${paymentDate}T00:00:00.000Z`),
        paymentMode: paymentMode as PaymentMode,
        transactionRef: transactionRef?.trim() || null,
        remarks: remarks?.trim() || null,
        status: newStatus,
      },

      update: {
        amountPaid,
        waivedAmount,
        paymentDate: new Date(`${paymentDate}T00:00:00.000Z`),
        paymentMode: paymentMode as PaymentMode,
        transactionRef: transactionRef?.trim() || null,
        remarks: remarks?.trim() || null,
        status: newStatus,
      },
    });

    revalidatePath("/school-admin/fees/collect");
    revalidatePath("/school-admin/fees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[recordPayment]", error);

    return {
      success: false,
      error: "Failed to record payment.",
    };
  }
}