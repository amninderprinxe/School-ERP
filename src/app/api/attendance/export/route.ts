import { NextRequest, NextResponse }  from "next/server";
import { auth }                       from "@/lib/auth";
import { prisma }                     from "@/lib/db";
import {
  isValidMonth,
  getCurrentMonth,
  getMonthRange,
}                                     from "@/lib/attendance-utils";
import type { AttendanceStatus }      from "@prisma/client";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  LATE:     "Late",
  HALF_DAY: "Half Day",
};

// ── Safe CSV cell: wrap in quotes, escape internal quotes ──────────
function csvCell(val: string | number | null | undefined): string {
  const s = val === null || val === undefined ? "" : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return new NextResponse("No school assigned", { status: 403 });
  }

  // ── Query params ──────────────────────────────────────────────
  const { searchParams } = request.nextUrl;
  const sectionId    = searchParams.get("sectionId")    ?? undefined;
  const statusParam  = searchParams.get("status")       ?? undefined;
  const month        = isValidMonth(searchParams.get("month"))
    ? searchParams.get("month")!
    : getCurrentMonth();

  const { gte, lte } = getMonthRange(month);

  // Validate status if provided
  const validStatuses: AttendanceStatus[] = [
    "PRESENT", "ABSENT", "LATE", "HALF_DAY",
  ];
  const statusFilter =
    statusParam && validStatuses.includes(statusParam as AttendanceStatus)
      ? (statusParam as AttendanceStatus)
      : undefined;

  // ── Fetch records ─────────────────────────────────────────────
  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date:  { gte, lte },
      ...(sectionId    && { sectionId }),
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      studentProfile: {
        include: {
          user:    { select: { name: true } },
          section: { include: { class: true } },
        },
      },
      markedBy: { select: { name: true } },
    },
    orderBy: [
      { date:           "asc"  },
      { studentProfile: { user: { name: "asc" } } },
    ],
  });

  // ── Build CSV ─────────────────────────────────────────────────
  const header = [
    "Date",
    "Day",
    "Student Name",
    "Class",
    "Section",
    "Status",
    "Remarks",
    "Marked By",
  ].map(csvCell).join(",");

  const rows = records.map((r) => {
    const dateObj = new Date(r.date);
    const dateStr = dateObj.toLocaleDateString("en-IN", {
      day:      "2-digit",
      month:    "short",
      year:     "numeric",
      timeZone: "Asia/Kolkata",
    });
    const dayStr = dateObj.toLocaleDateString("en-IN", {
      weekday:  "short",
      timeZone: "Asia/Kolkata",
    });
    const sec     = r.studentProfile.section;
    const className = sec?.class?.name ?? "";
    const secName   = sec?.name        ?? "";

    return [
      dateStr,
      dayStr,
      r.studentProfile.user.name,
      className,
      secName,
      STATUS_LABEL[r.status],
      r.remarks ?? "",
      r.markedBy.name,
    ].map(csvCell).join(",");
  });

  const csv = [header, ...rows].join("\r\n");

  // ── Descriptive filename ──────────────────────────────────────
  const [yr, mo] = month.split("-");
  const filename = `attendance-${yr}-${mo}${sectionId ? `-section` : ""}.csv`;

  return new NextResponse(csv, {
    status:  200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}