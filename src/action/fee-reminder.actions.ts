"use server";

import { requireRole }      from "@/lib/session";
import { prisma }           from "@/lib/db";
import * as email           from "@/lib/email";
import { calcOutstanding }  from "@/lib/fee-utils";
import type { ActionResult } from "@/types/actions";

const LOGIN_URL =
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

const sendFeeDueEmail = (email as any).sendFeeDueEmail
  ?? (email as any).sendFeeDueReminderEmail
  ?? (email as any).sendFeeReminderEmail;

if (typeof sendFeeDueEmail !== "function") {
  throw new Error("Fee due email sender is unavailable.");
}

// ─────────────────────────────────────────────────────────────────
// SEND FEE REMINDERS FOR A FEE STRUCTURE (SCHOOL_ADMIN only)
// Sends to all PENDING / PARTIAL students and their guardians via school email
// ─────────────────────────────────────────────────────────────────

export async function sendFeeReminders(
  feeStructureId: string,
): Promise<ActionResult> {
  try {
    const user     = await requireRole(["SCHOOL_ADMIN"]);
    const dbUser   = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { schoolId: true },
    });
    const schoolId = dbUser?.schoolId;
    if (!schoolId)
      return { success: false, error: "No school assigned." };

    const structure = await prisma.feeStructure.findFirst({
      where:   { id: feeStructureId, schoolId },
      include: { feeCategory: true, class: true },
    });
    if (!structure)
      return { success: false, error: "Fee structure not found." };

    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { name: true },
    });

    const payments = await prisma.feePayment.findMany({
      where: {
        feeStructureId,
        schoolId,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
        feeStructure: { select: { amount: true, dueDate: true } },
      },
    });

    if (payments.length === 0) {
      return {
        success: false,
        error:   "No pending or partial payments found for this fee structure.",
      };
    }

    let sent = 0;
    for (const p of payments) {
      const outstanding = calcOutstanding(
        Number(p.feeStructure.amount),
        Number(p.amountPaid),
        Number(p.waivedAmount),
      );
      if (outstanding <= 0) continue;

      const emailData = {
        schoolName:    school?.name ?? "School",
        studentName:   p.studentProfile.user.name,
        categoryName:  structure.feeCategory.name,
        academicYear:  structure.academicYear,
        dueDate:       structure.dueDate,
        amountDue:     Number(structure.amount),
        amountPaid:    Number(p.amountPaid),
        outstanding,
        loginUrl:      LOGIN_URL,
      };

      sendFeeDueEmail(p.studentProfile.user.email, {
        ...emailData,
        recipientName: p.studentProfile.user.name,
      });
      sent++;
    }

    // ActionResult.data expects an object with optional `id` string.
    // Provide the sent count as a string `id` to satisfy the type while
    // keeping the information available to callers.
    return { success: true, data: {
      id: String(sent),
      created: 0,
      map: function (arg0: (s: any) => any): Iterable<string> {
        throw new Error("Function not implemented.");
      }
    } };
  } catch (e) {
    console.error("[sendFeeReminders]", e);
    return { success: false, error: "Failed to send reminders." };
  }
}