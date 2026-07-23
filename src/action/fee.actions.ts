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
import { notifyStudentAndParents, NOTIFICATION_TYPES } from "@/lib/notify";
import { fmtCurrency } from "@/lib/fee-utils";
import type { ActionResult } from "@/types/actions";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import {
  sendFeeConfirmationEmail,
  sendFeeDueEmail,
} from "@/lib/email";
import { calcOutstanding } from "@/lib/fee-utils";

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

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

// Fetch latest schoolId directly from database.
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

// Audit failure should not fail the main fee operation.
async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[fee-audit-log]", error);
  }
}

function revalidateFeePages() {
  revalidatePath("/school-admin/fees");
  revalidatePath("/school-admin/fees/categories");
  revalidatePath("/school-admin/fees/structures");
  revalidatePath("/school-admin/fees/collect");
  revalidatePath("/student/fees");
  revalidatePath("/parent/fees");
}

// ─────────────────────────────────────────────────────────────────
// CREATE FEE CATEGORY
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
      description:
        formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const cleanName = parsed.data.name.trim();
    const cleanDescription =
      parsed.data.description?.trim() || null;

    const createdCategory =
      await prisma.feeCategory.create({
        data: {
          name: cleanName,
          description: cleanDescription,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.CREATE_FEE_CATEGORY,
      entity: "FeeCategory",
      entityId: createdCategory.id,
      entityName: createdCategory.name,
      metadata: {
        description: createdCategory.description,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Fee category created successfully.",
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
          "A fee category with this name already exists.",
        fieldErrors: {
          name: [
            "Name must be unique in your school.",
          ],
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

// ─────────────────────────────────────────────────────────────────
// UPDATE FEE CATEGORY
// ─────────────────────────────────────────────────────────────────

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

    const existing =
      await prisma.feeCategory.findFirst({
        where: {
          id,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          description: true,
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
      description:
        formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const cleanName = parsed.data.name.trim();
    const cleanDescription =
      parsed.data.description?.trim() || null;

    const updatedCategory =
      await prisma.feeCategory.update({
        where: {
          id: existing.id,
        },
        data: {
          name: cleanName,
          description: cleanDescription,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.UPDATE_FEE_CATEGORY,
      entity: "FeeCategory",
      entityId: updatedCategory.id,
      entityName: updatedCategory.name,
      metadata: {
        description: updatedCategory.description,
        previousName: existing.name,
        previousDescription: existing.description,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Fee category updated successfully.",
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
          "A fee category with this name already exists.",
        fieldErrors: {
          name: [
            "Name must be unique in your school.",
          ],
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

// ─────────────────────────────────────────────────────────────────
// DELETE FEE CATEGORY
// ─────────────────────────────────────────────────────────────────

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

    const existing =
      await prisma.feeCategory.findFirst({
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
        error:
          `Cannot delete — this category has ` +
          `${existing._count.feeStructures} fee structure(s). ` +
          `Delete those first.`,
      };
    }

    await prisma.feeCategory.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.DELETE_FEE_CATEGORY,
      entity: "FeeCategory",
      entityId: existing.id,
      entityName: existing.name,
      metadata: {
        description: existing.description,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Fee category deleted successfully.",
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
// CREATE FEE STRUCTURE
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
      feeCategoryId:
        formData.get("feeCategoryId"),
      classId:
        formData.get("classId") || undefined,
      amount: Number.isFinite(rawAmount)
        ? rawAmount
        : undefined,
      academicYear:
        formData.get("academicYear"),
      dueDate:
        formData.get("dueDate") || undefined,
      description:
        formData.get("description") || undefined,
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
      feeCategoryId,
      classId,
      amount,
      academicYear,
      dueDate,
      description,
    } = parsed.data;

    const category =
      await prisma.feeCategory.findFirst({
        where: {
          id: feeCategoryId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!category) {
      return {
        success: false,
        error:
          "Fee category not found in your school.",
      };
    }

    let className: string | null = null;

    if (classId) {
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
            "Class not found in your school.",
        };
      }

      className = schoolClass.name;
    }

    const cleanAcademicYear =
      academicYear.trim();

    const createdStructure =
      await prisma.feeStructure.create({
        data: {
          schoolId,
          feeCategoryId,
          classId: classId || null,
          amount,
          academicYear: cleanAcademicYear,
          dueDate: dueDate
            ? new Date(
              `${dueDate}T00:00:00.000Z`,
            )
            : null,
          description:
            description?.trim() || null,
        },
        select: {
          id: true,
          feeCategoryId: true,
          classId: true,
          amount: true,
          academicYear: true,
          dueDate: true,
          description: true,
        },
      });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.CREATE_FEE_STRUCTURE,
      entity: "FeeStructure",
      entityId: createdStructure.id,
      entityName:
        `${category.name} - ${cleanAcademicYear}`,
      metadata: {
        feeCategoryId:
          createdStructure.feeCategoryId,
        feeCategoryName: category.name,
        classId: createdStructure.classId,
        className,
        amount: createdStructure.amount,
        academicYear:
          createdStructure.academicYear,
        dueDate:
          createdStructure.dueDate?.toISOString() ??
          null,
        description:
          createdStructure.description,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Fee structure created successfully.",
    };
  } catch (error) {
    console.error("[createFeeStructure]", error);

    return {
      success: false,
      error: "Failed to create fee structure.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE FEE STRUCTURE
// ─────────────────────────────────────────────────────────────────

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

    const existing =
      await prisma.feeStructure.findFirst({
        where: {
          id,
          schoolId,
        },
        include: {
          feeCategory: {
            select: {
              name: true,
            },
          },
          class: {
            select: {
              name: true,
            },
          },
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
        error:
          `Cannot delete — ` +
          `${existing._count.payments} payment record(s) exist. ` +
          `Clear payments first.`,
      };
    }

    await prisma.feeStructure.delete({
      where: {
        id: existing.id,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.DELETE_FEE_STRUCTURE,
      entity: "FeeStructure",
      entityId: existing.id,
      entityName:
        `${existing.feeCategory.name} - ${existing.academicYear}`,
      metadata: {
        feeCategoryId:
          existing.feeCategoryId,
        feeCategoryName:
          existing.feeCategory.name,
        classId: existing.classId,
        className:
          existing.class?.name ?? null,
        amount: existing.amount,
        academicYear: existing.academicYear,
        dueDate:
          existing.dueDate?.toISOString() ??
          null,
        description: existing.description,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Fee structure deleted successfully.",
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

    const structure =
      await prisma.feeStructure.findFirst({
        where: {
          id: structureId,
          schoolId,
        },
        select: {
          id: true,
          classId: true,
          amount: true,
          academicYear: true,
          feeCategoryId: true,
          feeCategory: {
            select: {
              name: true,
            },
          },
        },
      });

    if (!structure) {
      return {
        success: false,
        error:
          "Fee structure not found in your school.",
      };
    }

    const students =
      await prisma.studentProfile.findMany({
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
        error:
          "No active students found for this fee structure's class.",
      };
    }

    let created = 0;
    let existing = 0;

    for (const student of students) {
      const alreadyExists =
        await prisma.feePayment.findUnique({
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

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.ASSIGN_FEE_STRUCTURE,
      entity: "FeeStructure",
      entityId: structure.id,
      entityName:
        `${structure.feeCategory.name} - ${structure.academicYear}`,
      metadata: {
        created,
        existing,
        totalStudents: students.length,
        classId: structure.classId,
        feeCategoryId:
          structure.feeCategoryId,
        amount: structure.amount,
        academicYear:
          structure.academicYear,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      data: {
        created,
        existing,
      },
    };
  } catch (error) {
    console.error(
      "[assignStructureToStudents]",
      error,
    );

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

    const parsed =
      RecordPaymentSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
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

    const structure =
      await prisma.feeStructure.findFirst({
        where: {
          id: feeStructureId,
          schoolId,
        },
        select: {
          id: true,
          amount: true,
          academicYear: true,
          feeCategoryId: true,
          feeCategory: {
            select: {
              name: true,
            },
          },
        },
      });

    if (!structure) {
      return {
        success: false,
        error:
          "Fee structure not found in your school.",
      };
    }

    const student =
      await prisma.studentProfile.findFirst({
        where: {
          id: studentProfileId,
          user: {
            schoolId,
          },
        },
        select: {
          id: true,
          rollNumber: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

    if (!student) {
      return {
        success: false,
        error:
          "Student not found in your school.",
      };
    }

    const total = amountPaid + waivedAmount;

    if (total > structure.amount + 0.01) {
      return {
        success: false,
        error:
          `Total paid + waived (${total}) exceeds ` +
          `fee amount (${structure.amount}).`,
      };
    }

    const newStatus = calcNewStatus(
      structure.amount,
      amountPaid,
      waivedAmount,
    );

    const payment =
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
          paymentDate: new Date(
            `${paymentDate}T00:00:00.000Z`,
          ),
          paymentMode:
            paymentMode as PaymentMode,
          transactionRef:
            transactionRef?.trim() || null,
          remarks: remarks?.trim() || null,
          status: newStatus,
        },

        update: {
          amountPaid,
          waivedAmount,
          paymentDate: new Date(
            `${paymentDate}T00:00:00.000Z`,
          ),
          paymentMode:
            paymentMode as PaymentMode,
          transactionRef:
            transactionRef?.trim() || null,
          remarks: remarks?.trim() || null,
          status: newStatus,
        },

        select: {
          id: true,
          amountPaid: true,
          waivedAmount: true,
          status: true,
          paymentDate: true,
          paymentMode: true,
          transactionRef: true,
        },
      });

    void notifyStudentAndParents(studentProfileId, {
      title: "Fee payment recorded",
      body: `${fmtCurrency(amountPaid)} received. Status: ${newStatus}.`,
      link: "/student/fees",
      type: NOTIFICATION_TYPES.FEE_RECORDED,
      schoolId,
    });

    void (async () => {
      try {
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
        const school = await prisma.school.findUnique({
          where: { id: schoolId }, select: { name: true },
        });
        const sp = await prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
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
        if (!sp) return;

        const outstanding = calcOutstanding(structure.amount, amountPaid, waivedAmount);
        const emailData = {
          schoolName: school?.name ?? "School",
          studentName: sp.user.name,
          categoryName: structure.feeCategory?.name ?? "Fee",
          academicYear: structure.academicYear,
          amountPaid,
          outstanding,
          status: newStatus,
          paymentMode,
          transactionRef: transactionRef?.trim() || null,
          paymentDate: new Date(paymentDate),
          loginUrl,
        };
        const recipients = [
          { email: sp.user.email, name: sp.user.name },
          ...sp.parents.map((p) => ({
            email: p.parentProfile.user.email,
            name: p.parentProfile.user.name,
          })),
        ];
        for (const r of recipients) {
          sendFeeConfirmationEmail(r.email, {
            ...emailData,
            recipientName: r.name,
          });
        }
      } catch (err) {
        console.error("[fee email]", err);
      }
    })();


    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.RECORD_PAYMENT,
      entity: "FeePayment",
      entityId: payment.id,
      entityName:
        student.user.name ?? "Unknown Student",
      metadata: {
        studentProfileId: student.id,
        rollNumber: student.rollNumber,
        feeStructureId: structure.id,
        feeCategoryId:
          structure.feeCategoryId,
        feeCategoryName:
          structure.feeCategory.name,
        academicYear:
          structure.academicYear,
        feeAmount: structure.amount,
        amountPaid: payment.amountPaid,
        waivedAmount:
          payment.waivedAmount,
        status: payment.status,
        paymentDate:
          payment.paymentDate?.toISOString() ??
          null,
        paymentMode: payment.paymentMode,
        transactionRef:
          payment.transactionRef,
      },
    });

    revalidateFeePages();

    return {
      success: true,
      message: "Payment recorded successfully.",
    };
  } catch (error) {
    console.error("[recordPayment]", error);

    return {
      success: false,
      error: "Failed to record payment.",
    };
  }
}
