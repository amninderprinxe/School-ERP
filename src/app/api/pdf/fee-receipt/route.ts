import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  FeeReceiptPDF,
  type FeeReceiptData,
  type FeeReceiptPayment,
} from "@/lib/pdf/fee-receipt-pdf";

import { calcOutstanding } from "@/lib/fee-utils";

export const runtime = "nodejs";

// ── Logo helpers ──────────────────────────────────────────────────

function sanitizeSchoolCode(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

function getImageMimeType(fileName: string): string {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".webp":
      return "image/webp";

    case ".png":
    default:
      return "image/png";
  }
}

function getSchoolLogoDataUri(
  schoolCode: string | null | undefined,
): string | null {
  if (!schoolCode) {
    return null;
  }

  const safeCode = sanitizeSchoolCode(
    schoolCode,
  );

  if (!safeCode) {
    return null;
  }

  /*
   * Example:
   *
   * school.code = "4S"
   *
   * Logo:
   * public/uploads/schools/4S.png
   */
  const possibleFileNames = Array.from(
    new Set([
      `${safeCode}.png`,
      `${safeCode.toUpperCase()}.png`,
      `${safeCode.toLowerCase()}.png`,
      `${safeCode}.jpg`,
      `${safeCode.toUpperCase()}.jpg`,
      `${safeCode.toLowerCase()}.jpg`,
      `${safeCode}.jpeg`,
      `${safeCode}.webp`,
    ]),
  );

  for (const fileName of possibleFileNames) {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "schools",
      fileName,
    );

    if (!fs.existsSync(logoPath)) {
      continue;
    }

    try {
      const logoBuffer =
        fs.readFileSync(logoPath);

      const mimeType =
        getImageMimeType(fileName);

      return (
        `data:${mimeType};base64,` +
        logoBuffer.toString("base64")
      );
    } catch (logoError) {
      console.warn(
        `[PDF/fee-receipt] Failed to read logo at ${logoPath}:`,
        logoError,
      );

      return null;
    }
  }

  console.warn(
    `[PDF/fee-receipt] Logo not found for school code "${safeCode}" inside public/uploads/schools`,
  );

  return null;
}

// ── Route ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    // ── Authentication ──────────────────────────────────────────

    const session = await auth();

    if (!session?.user) {
      return new NextResponse(
        "Unauthorized",
        {
          status: 401,
        },
      );
    }

    // ── Read studentProfileId ───────────────────────────────────

    const studentProfileId =
      req.nextUrl.searchParams.get(
        "studentProfileId",
      );

    if (!studentProfileId?.trim()) {
      return new NextResponse(
        "Missing studentProfileId",
        {
          status: 400,
        },
      );
    }

    const role = session.user.role;
    const userId = session.user.id;

    // ── Fetch student profile ───────────────────────────────────

    const studentProfile =
      await prisma.studentProfile.findUnique({
        where: {
          id: studentProfileId,
        },

        include: {
          user: {
            select: {
              name: true,
              schoolId: true,
            },
          },

          section: {
            include: {
              class: true,
            },
          },
        },
      });

    if (!studentProfile) {
      return new NextResponse(
        "Student not found",
        {
          status: 404,
        },
      );
    }

    const studentSchoolId =
      studentProfile.user.schoolId;

    if (!studentSchoolId) {
      return new NextResponse(
        "Student is not linked to a school",
        {
          status: 400,
        },
      );
    }

    // ── Role-based access control ───────────────────────────────

    if (role === "STUDENT") {
      const ownStudentProfile =
        await prisma.studentProfile.findUnique({
          where: {
            userId,
          },

          select: {
            id: true,
          },
        });

      if (
        ownStudentProfile?.id !==
        studentProfileId
      ) {
        return new NextResponse(
          "Forbidden",
          {
            status: 403,
          },
        );
      }
    } else if (role === "PARENT") {
      const parentProfile =
        await prisma.parentProfile.findUnique({
          where: {
            userId,
          },

          select: {
            id: true,
          },
        });

      if (!parentProfile) {
        return new NextResponse(
          "Forbidden",
          {
            status: 403,
          },
        );
      }

      const parentStudentLink =
        await prisma.parentStudent.findFirst({
          where: {
            parentProfileId:
              parentProfile.id,

            studentProfileId,
          },

          select: {
            id: true,
          },
        });

      if (!parentStudentLink) {
        return new NextResponse(
          "Forbidden",
          {
            status: 403,
          },
        );
      }
    } else if (
      role === "SCHOOL_ADMIN"
    ) {
      /*
       * Fetch schoolId from database instead
       * of relying only on session/JWT data.
       */
      const adminUser =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            schoolId: true,
          },
        });

      if (
        !adminUser?.schoolId ||
        adminUser.schoolId !==
          studentSchoolId
      ) {
        return new NextResponse(
          "Forbidden",
          {
            status: 403,
          },
        );
      }
    } else if (
      role !== "SUPER_ADMIN"
    ) {
      return new NextResponse(
        "Forbidden",
        {
          status: 403,
        },
      );
    }

    // ── Fetch fee payments and school ───────────────────────────

    const [feePayments, school] =
      await Promise.all([
        prisma.feePayment.findMany({
          where: {
            studentProfileId,
            schoolId: studentSchoolId,
          },

          include: {
            feeStructure: {
              include: {
                feeCategory: true,
                class: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        }),

        prisma.school.findUnique({
          where: {
            id: studentSchoolId,
          },

          select: {
            name: true,

            /*
             * Same school code used for student
             * login IDs such as 4S-10A-015.
             */
            code: true,
          },
        }),
      ]);

    if (!school) {
      return new NextResponse(
        "School not found",
        {
          status: 404,
        },
      );
    }

    // ── Load dynamic school logo ────────────────────────────────

    const schoolLogo =
      getSchoolLogoDataUri(
        school.code,
      );

    // ── Convert payments for PDF ────────────────────────────────

    const payments: FeeReceiptPayment[] =
      feePayments.map((payment) => {
        const structureAmount = Number(
          payment.feeStructure.amount,
        );

        const amountPaid = Number(
          payment.amountPaid,
        );

        const waivedAmount = Number(
          payment.waivedAmount,
        );

        const outstanding =
          calcOutstanding(
            structureAmount,
            amountPaid,
            waivedAmount,
          );

        return {
          categoryName:
            payment.feeStructure
              .feeCategory.name,

          structureDesc:
            payment.feeStructure
              .description,

          academicYear:
            payment.feeStructure
              .academicYear,

          className:
            payment.feeStructure
              .class?.name ?? null,

          structureAmount,
          amountPaid,
          waivedAmount,
          outstanding,

          status: payment.status,

          paymentDate:
            payment.paymentDate,

          paymentMode:
            payment.paymentMode,

          transactionRef:
            payment.transactionRef,

          remarks:
            payment.remarks,
        };
      });

    // ── Prepare receipt data ─────────────────────────────────────

    const data: FeeReceiptData = {
      schoolName: school.name,
      schoolLogo,

      studentName:
        studentProfile.user.name,

      rollNumber:
        studentProfile.rollNumber ??
        null,

      admissionNo:
        studentProfile.admissionNo ??
        null,

      className:
        studentProfile.section
          ?.class.name ?? null,

      sectionName:
        studentProfile.section
          ?.name ?? null,

      payments,
      generatedAt: new Date(),
    };

    // ── Generate PDF ─────────────────────────────────────────────

    const pdfBuffer =
      await renderToBuffer(
        FeeReceiptPDF({ data }),
      );

    const safeStudentName =
      studentProfile.user.name
        .trim()
        .replace(
          /[^a-zA-Z0-9]+/g,
          "-",
        )
        .replace(
          /^-+|-+$/g,
          "",
        )
        .toLowerCase() ||
      "student";

    const pdfBytes =
      new Uint8Array(pdfBuffer);

    // ── Return PDF ───────────────────────────────────────────────

    return new NextResponse(
      pdfBytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="fee-receipt-${safeStudentName}.pdf"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "[PDF/fee-receipt]",
      error,
    );

    return new NextResponse(
      "Failed to generate PDF",
      {
        status: 500,
      },
    );
  }
}