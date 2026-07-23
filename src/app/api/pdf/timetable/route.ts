import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  TimetablePDF,
  type TimetablePdfData,
} from "@/lib/pdf/timetable-pdf";

import type { DayOfWeekType } from "@/lib/validations/timetable";

export const runtime = "nodejs";

// ── Helpers ───────────────────────────────────────────────────────

function sanitizeSchoolCode(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

function getImageMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

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
        `[PDF/timetable] Failed to read logo at ${logoPath}:`,
        logoError,
      );

      return null;
    }
  }

  console.warn(
    `[PDF/timetable] Logo not found for school code "${safeCode}"`,
  );

  return null;
}

function createSafeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

    // ── Request parameters ──────────────────────────────────────

    const sectionId =
      req.nextUrl.searchParams.get("sectionId");

    if (!sectionId?.trim()) {
      return new NextResponse("Missing sectionId", {
        status: 400,
      });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const sessionSchoolId = session.user.schoolId;

    const allowedRoles = [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
      "STUDENT",
      "PARENT",
    ] as const;

    if (
      !allowedRoles.includes(
        role as (typeof allowedRoles)[number],
      )
    ) {
      return new NextResponse("Forbidden", {
        status: 403,
      });
    }

    if (
      role !== "SUPER_ADMIN" &&
      !sessionSchoolId
    ) {
      return new NextResponse(
        "User is not linked to a school",
        {
          status: 403,
        },
      );
    }

    // ── Fetch section, class and school ─────────────────────────

    const section = await prisma.section.findFirst({
      where:
        role === "SUPER_ADMIN"
          ? {
              id: sectionId,
            }
          : {
              id: sectionId,
              schoolId: sessionSchoolId!,
            },

      include: {
        class: {
          select: {
            name: true,
          },
        },

        school: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!section) {
      return new NextResponse("Section not found", {
        status: 404,
      });
    }

    // ── Student access validation ───────────────────────────────

    if (role === "STUDENT") {
      const ownStudentProfile =
        await prisma.studentProfile.findFirst({
          where: {
            userId,
            sectionId: section.id,

            user: {
              schoolId: section.schoolId,
            },
          },

          select: {
            id: true,
          },
        });

      if (!ownStudentProfile) {
        return new NextResponse("Forbidden", {
          status: 403,
        });
      }
    }

    // ── Parent access validation ────────────────────────────────

    if (role === "PARENT") {
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
        return new NextResponse("Forbidden", {
          status: 403,
        });
      }

      const linkedStudent =
        await prisma.parentStudent.findFirst({
          where: {
            parentProfileId: parentProfile.id,

            studentProfile: {
              sectionId: section.id,

              user: {
                schoolId: section.schoolId,
              },
            },
          },

          select: {
            id: true,
          },
        });

      if (!linkedStudent) {
        return new NextResponse("Forbidden", {
          status: 403,
        });
      }
    }

    // ── Teacher access validation ───────────────────────────────

    if (role === "TEACHER") {
      const teacherProfile =
        await prisma.teacherProfile.findFirst({
          where: {
            userId,

            user: {
              schoolId: section.schoolId,
            },
          },

          select: {
            id: true,
          },
        });

      if (!teacherProfile) {
        return new NextResponse("Forbidden", {
          status: 403,
        });
      }

      const assignedPeriod =
        await prisma.period.findFirst({
          where: {
            sectionId: section.id,
            schoolId: section.schoolId,
            teacherProfileId: teacherProfile.id,
          },

          select: {
            id: true,
          },
        });

      if (!assignedPeriod) {
        return new NextResponse("Forbidden", {
          status: 403,
        });
      }
    }

    // ── Current academic year ───────────────────────────────────

    const currentYear =
      await prisma.academicYear.findFirst({
        where: {
          schoolId: section.schoolId,
          isCurrent: true,
        },

        select: {
          id: true,
          name: true,
        },
      });

    // ── Fetch timetable periods ─────────────────────────────────

    const rawPeriods = await prisma.period.findMany({
      where: {
        sectionId: section.id,
        schoolId: section.schoolId,

        OR: currentYear
          ? [
              {
                academicYearId: currentYear.id,
              },
              {
                academicYearId: null,
              },
            ]
          : [
              {
                academicYearId: null,
              },
            ],
      },

      include: {
        subject: {
          select: {
            name: true,
            code: true,
          },
        },

        teacherProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          periodNumber: "asc",
        },
      ],
    });

    // ── Deduplicate periods by slot ─────────────────────────────

    const periodMap = new Map<
      string,
      (typeof rawPeriods)[number]
    >();

    for (const period of rawPeriods) {
      const slotKey =
        `${period.dayOfWeek}-${period.periodNumber}`;

      const existingPeriod =
        periodMap.get(slotKey);

      if (
        !existingPeriod ||
        (
          period.academicYearId !== null &&
          existingPeriod.academicYearId === null
        )
      ) {
        periodMap.set(slotKey, period);
      }
    }

    const periods = Array.from(
      periodMap.values(),
    );

    // ── School logo ─────────────────────────────────────────────

    const schoolLogo =
      getSchoolLogoDataUri(
        section.school.code,
      );

    // ── PDF data ────────────────────────────────────────────────

    const data: TimetablePdfData = {
      schoolName: section.school.name,
      schoolLogo,

      className: section.class.name,
      sectionName: section.name,
      academicYear: currentYear?.name ?? null,

      periods: periods.map((period) => ({
        dayOfWeek:
          period.dayOfWeek as DayOfWeekType,

        periodNumber:
          period.periodNumber,

        startTime:
          period.startTime,

        endTime:
          period.endTime,

        subjectName:
          period.subject?.name ?? null,

        subjectCode:
          period.subject?.code ?? null,

        teacherName:
          period.teacherProfile?.user.name ??
          null,
      })),

      generatedAt: new Date(),
    };

    // ── Render PDF ──────────────────────────────────────────────

    const buffer = await renderToBuffer(
      TimetablePDF({ data }),
    );

    const pdfBytes =
      new Uint8Array(buffer);

    const safeFileName =
      createSafeFileName(
        `${section.class.name}-${section.name}`,
      ) || "section";

    // ── Response ────────────────────────────────────────────────

    return new NextResponse(pdfBytes, {
      status: 200,

      headers: {
        "Content-Type": "application/pdf",

        "Content-Disposition":
          `inline; filename="timetable-${safeFileName}.pdf"`,

        "Cache-Control":
          "private, no-store, max-age=0",

        "X-Content-Type-Options":
          "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "[PDF/timetable]",
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