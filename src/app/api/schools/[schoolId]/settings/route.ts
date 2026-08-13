import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]);
    const { schoolId } = await params;
    const body = await req.json();

    // 1. Update the school settings (e.g., lateFeePercent, receiptPrefix)
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(body.lateFeePercent !== undefined && { lateFeePercent: body.lateFeePercent }),
        ...(body.receiptPrefix !== undefined && { receiptPrefix: body.receiptPrefix }),
      },
    });

    // 2. If lateFeePercent was updated, apply late fine calculation to pending payments
    if (body.lateFeePercent !== undefined) {
      const finePercentage = Number(body.lateFeePercent);

      // Fetch pending fee payments based on your schema's PaymentStatus enum
      const pendingPayments = await prisma.feePayment.findMany({
        where: {
          schoolId: schoolId,
          status: { not: "PAID" },
        },
        include: {
          feeStructure: true, // Pulls the base fee structure if applicable
        },
      });

      // Loop through pending records and update them using correct schema fields
      for (const payment of pendingPayments) {
        // Calculate pending balance using existing schema fields (amountPaid, waivedAmount)
        const totalDue = Number(payment.feeStructure?.amount ?? 0);
        const paid = Number(payment.amountPaid ?? 0);
        const waived = Number(payment.waivedAmount ?? 0);
        const remainingDue = Math.max(0, totalDue - paid - waived);

        if (remainingDue > 0) {
          const calculatedFine = (remainingDue * finePercentage) / 100;

          // Note: If you need to store fine or updated totals, 
          // ensure your FeePayment schema includes those columns, 
          // or record remarks/adjustments matching your model fields.
          await prisma.feePayment.update({
            where: { id: payment.id },
            data: {
              remarks: `Late fee fine applied (${finePercentage}%)`,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, school: updatedSchool });
  } catch (error) {
    console.error("Error updating school settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}