import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  AttendancePDF,
  type AttPdfData,
} from "@/lib/pdf/attendance-pdf";
import {
  isValidMonth,
  getCurrentMonth,
  getMonthRange,
  formatMonth,
} from "@/lib/attendance-utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const studentProfileId = searchParams.get("studentProfileId");
    const month = isValidMonth(searchParams.get("month"))
      ? searchParams.get("month")!
      : getCurrentMonth();

    if (!studentProfileId) {
      return new NextResponse("Missing studentProfileId", { status: 400 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    // ── Fetch student profile ────────────────────────────────────
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: { select: { name: true, schoolId: true } },
        section: { include: { class: true } },
      },
    });

    if (!studentProfile) {
      return new NextResponse("Student not found", { status: 404 });
    }

    const studentSchoolId = studentProfile.user.schoolId;

    // ── Role-based access control ────────────────────────────────
    if (role === "STUDENT") {
      const own = await prisma.studentProfile.findUnique({ where: { userId } });
      if (own?.id !== studentProfileId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (role === "PARENT") {
      const pp = await prisma.parentProfile.findUnique({ where: { userId } });
      if (!pp) return new NextResponse("Forbidden", { status: 403 });
      const link = await prisma.parentStudent.findFirst({
        where: { parentProfileId: pp.id, studentProfileId },
      });
      if (!link) return new NextResponse("Forbidden", { status: 403 });
    } else if (role === "SCHOOL_ADMIN" || role === "TEACHER") {
      if (session.user.schoolId !== studentSchoolId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (role !== "SUPER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // ── Fetch attendance records ─────────────────────────────────
    const { gte, lte } = getMonthRange(month);

    const records = await prisma.attendance.findMany({
      where: {
        studentProfileId,
        schoolId: studentSchoolId!,
        date: { gte, lte },
      },
      select: { date: true, status: true, remarks: true },
      orderBy: { date: "asc" },
    });

    // ── Compute summary ──────────────────────────────────────────
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
    const total = records.length;
    const percentage =
      total === 0
        ? 0
        : Math.round(((present + late + halfDay * 0.5) / total) * 100);

    const [school] = await Promise.all([
      prisma.school.findUnique({
        where: { id: studentSchoolId! },
        select: { name: true },
      }),
    ]);

    const data: AttPdfData = {
      schoolName: school?.name ?? "School",
      studentName: studentProfile.user.name,
      rollNumber: studentProfile.rollNumber,
      className: studentProfile.section?.class.name ?? null,
      sectionName: studentProfile.section?.name ?? null,
      monthLabel: formatMonth(month),
      present,
      absent,
      late,
      halfDay,
      total,
      percentage,
      records: records.map((r) => ({
        date: new Date(r.date),
        status: r.status,
        remarks: r.remarks,
      })),
      generatedAt: new Date(),
    };

    const buffer = await renderToBuffer(
      AttendancePDF({ data }),
    );

    const safeName = studentProfile.user.name.replace(/\s+/g, "-");

    const pdfBytes = new Uint8Array(buffer);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="attendance-${safeName}-${month}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[PDF/attendance]", e);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}