import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  ReportCardPDF,
  type ReportCardData,
  type RCExam,
  type RCSubject,
} from "@/lib/pdf/report-card-pdf";

import type { ExamType } from "@prisma/client";

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

  const safeCode = sanitizeSchoolCode(schoolCode);

  if (!safeCode) {
    return null;
  }

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
      const logoBuffer = fs.readFileSync(logoPath);
      const mimeType = getImageMimeType(fileName);

      return (
        `data:${mimeType};base64,` +
        logoBuffer.toString("base64")
      );
    } catch (logoError) {
      console.warn(
        `[PDF/report-card] Failed to read logo at ${logoPath}:`,
        logoError,
      );

      return null;
    }
  }

  console.warn(
    `[PDF/report-card] Logo not found for school code "${safeCode}" inside public/uploads/schools`,
  );

  return null;
}

function createSafeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// ── Route ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    // ── Authentication ──────────────────────────────────────────

    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", {
        status: 401,
      });
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
      role === "SCHOOL_ADMIN" ||
      role === "TEACHER"
    ) {
      /*
       * Re-fetch the current user's school ID from the database
       * instead of relying only on the JWT/session value.
       */
      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            schoolId: true,
          },
        });

      if (
        !currentUser?.schoolId ||
        currentUser.schoolId !==
          studentSchoolId
      ) {
        return new NextResponse(
          "Forbidden",
          {
            status: 403,
          },
        );
      }
    } else if (role !== "SUPER_ADMIN") {
      return new NextResponse(
        "Forbidden",
        {
          status: 403,
        },
      );
    }

    // ── Fetch results ───────────────────────────────────────────

    const rawResults =
      await prisma.result.findMany({
        where: {
          studentProfileId,
          schoolId: studentSchoolId,
        },

        include: {
          exam: {
            include: {
              class: true,
            },
          },

          subject: true,
        },

        orderBy: [
          {
            exam: {
              startDate: "desc",
            },
          },
          {
            exam: {
              createdAt: "desc",
            },
          },
          {
            subject: {
              name: "asc",
            },
          },
        ],
      });

    // ── Group results by exam ───────────────────────────────────

    const examMap = new Map<string, RCExam>();

    for (const result of rawResults) {
      if (!examMap.has(result.examId)) {
        examMap.set(result.examId, {
          examName: result.exam.name,

          examType:
            result.exam.examType as ExamType,

          className:
            result.exam.class.name,

          startDate:
            result.exam.startDate,

          endDate:
            result.exam.endDate,

          results: [],
        });
      }

      const subjectResult: RCSubject = {
        subjectName:
          result.subject.name,

        subjectCode:
          result.subject.code,

        marksObtained:
          Number(result.marksObtained),

        maxMarks:
          Number(result.maxMarks),

        grade:
          result.grade,
      };

      examMap
        .get(result.examId)!
        .results
        .push(subjectResult);
    }

    // ── Fetch school and current academic year ─────────────────

    const [school, currentYear] =
      await Promise.all([
        prisma.school.findUnique({
          where: {
            id: studentSchoolId,
          },

          select: {
            name: true,

            /*
             * This must be the same field used while generating
             * student login IDs such as:
             *
             * 4S-10A-015
             */
            code: true,
          },
        }),

        prisma.academicYear.findFirst({
          where: {
            schoolId: studentSchoolId,
            isCurrent: true,
          },

          select: {
            name: true,
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

    // ── Load school logo ────────────────────────────────────────

    const schoolLogo =
      getSchoolLogoDataUri(
        school.code,
      );

    // ── Prepare report-card data ────────────────────────────────

    const data: ReportCardData = {
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

      academicYear:
        currentYear?.name ?? null,

      exams:
        Array.from(examMap.values()),

      generatedAt:
        new Date(),
    };

    // ── Generate PDF ────────────────────────────────────────────

    const buffer =
      await renderToBuffer(
        ReportCardPDF({ data }),
      );

    const pdfBytes =
      new Uint8Array(buffer);

    const safeStudentName =
      createSafeFileName(
        studentProfile.user.name,
      ) || "student";

    // ── Return PDF ──────────────────────────────────────────────

    return new NextResponse(
      pdfBytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="report-card-${safeStudentName}.pdf"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "[PDF/report-card]",
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