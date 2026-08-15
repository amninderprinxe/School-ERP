import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma as rawPrisma } from "@/lib/db";
import type { SchoolEventType } from "@prisma/client";

const prisma = rawPrisma as any;

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  exam: "#7c3aed",
  ptm: "#2563eb",
  holiday: "#dc2626",
  birthday: "#db2777",
  fee: "#d97706",
  school_event: "#059669",
  announcement: "#0891b2",
};

async function getSchoolIdFromSession(session: any): Promise<string | null> {
  if (session?.user?.schoolId) return session.user.schoolId;

  // Fallback: Find user by ID or Email
  const identifier = session?.user?.id ? { id: session.user.id } : session?.user?.email ? { email: session.user.email } : null;
  if (!identifier) return null;

  const dbUser = await prisma.user.findFirst({
    where: identifier,
    select: { schoolId: true },
  });

  return dbUser?.schoolId ?? null;
}

function toDateString(d: any): string {
  if (!d) return "";
  if (typeof d === "string") {
    return d.includes("T") ? d.split("T")[0]! : d;
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─────────────────────────────────────────────────────────────────
// GET — Fetch All School Calendar Events
// ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json([], { status: 401 });
    }

    const schoolId = await getSchoolIdFromSession(session);
    if (!schoolId) {
      console.warn("[CALENDAR_GET] No schoolId found for user:", session.user);
      return NextResponse.json([]);
    }

    const [exams, ptmSlots, holidays, feeStructures, schoolEvents, announcements] =
      await Promise.all([
        prisma.exam.findMany({
          where: { schoolId },
          include: { class: { select: { name: true } } },
        }).catch((e: any) => { console.error("exams err", e); return []; }),

        prisma.ptmSlot.findMany({
          where: { schoolId },
          include: {
            teacherProfile: { include: { user: { select: { name: true } } } },
            booking: {
              include: {
                studentProfile: { include: { user: { select: { name: true } } } },
              },
            },
          },
        }).catch((e: any) => { console.error("ptm err", e); return []; }),

        prisma.holiday.findMany({
          where: { schoolId },
        }).catch((e: any) => { console.error("holiday err", e); return []; }),

        prisma.feeStructure.findMany({
          where: { schoolId },
          include: { feeCategory: { select: { name: true } } },
        }).catch((e: any) => { console.error("fee err", e); return []; }),

        prisma.schoolEvent.findMany({
          where: { schoolId },
          include: { createdBy: { select: { name: true } } },
        }).catch((e: any) => { console.error("schoolEvents err", e); return []; }),

        prisma.announcement.findMany({
          where: { schoolId },
        }).catch((e: any) => { console.error("announcement err", e); return []; }),
      ]);

    const events: Record<string, unknown>[] = [];

    // 1. School Events
    for (const e of schoolEvents) {
      const startStr = toDateString(e.startDate);
      const endStr = e.endDate ? toDateString(e.endDate) : undefined;
      events.push({
        id: `event-${e.id}`,
        title: e.title,
        start: startStr,
        end: endStr,
        allDay: e.allDay ?? true,
        color: e.color || TYPE_COLOR.school_event,
        extendedProps: {
          type: "school_event",
          eventType: e.type,
          description: e.description,
          createdBy: e.createdBy?.name ?? "Admin",
        },
      });
    }

    // 2. Holidays
    for (const h of holidays) {
      events.push({
        id: `holiday-${h.id}`,
        title: `🎌 ${h.name}`,
        start: toDateString(h.date),
        allDay: true,
        color: TYPE_COLOR.holiday,
        extendedProps: {
          type: "holiday",
          description: h.description,
        },
      });
    }

    // 3. Exams
    for (const e of exams) {
      events.push({
        id: `exam-${e.id}`,
        title: e.name,
        start: toDateString(e.startDate || e.createdAt),
        end: e.endDate ? toDateString(e.endDate) : undefined,
        allDay: true,
        color: TYPE_COLOR.exam,
        extendedProps: {
          type: "exam",
          className: e.class?.name ?? "",
        },
      });
    }

    // 4. Announcements
    for (const a of announcements) {
      events.push({
        id: `ann-${a.id}`,
        title: `📢 ${a.title}`,
        start: toDateString(a.createdAt),
        allDay: true,
        color: TYPE_COLOR.announcement,
        extendedProps: {
          type: "announcement",
          description: a.content?.slice(0, 120),
        },
      });
    }

    // 5. Fee Dues
    for (const f of feeStructures) {
      if (!f.dueDate) continue;
      events.push({
        id: `fee-${f.id}`,
        title: `💳 ${f.feeCategory?.name ?? "Fee"} Due`,
        start: toDateString(f.dueDate),
        allDay: true,
        color: TYPE_COLOR.fee,
        extendedProps: {
          type: "fee",
          amount: f.amount,
        },
      });
    }

    // 6. PTM
    for (const s of ptmSlots) {
      events.push({
        id: `ptm-${s.id}`,
        title: s.booking ? `PTM: Booked` : `PTM Slot`,
        start: toDateString(s.date),
        allDay: true,
        color: TYPE_COLOR.ptm,
        extendedProps: {
          type: "ptm",
        },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error("[CALENDAR_GET_ERROR]", error);
    return NextResponse.json([]);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST — Create School Event
// ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const schoolId = await getSchoolIdFromSession(session);
  if (!schoolId) return new NextResponse("No school assigned", { status: 400 });

  // Get user ID
  let userId = session.user.id;
  if (!userId && session.user.email) {
    const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    userId = u?.id;
  }

  try {
    const body = await request.json();
    const { title, description, startDate, endDate, allDay, startTime, endTime, type, color } = body;

    if (!title?.trim() || !startDate) {
      return NextResponse.json({ error: "Title and start date required" }, { status: 400 });
    }

    const parsedStart = new Date(startDate.includes("T") ? startDate : `${startDate}T00:00:00`);
    const parsedEnd = endDate ? new Date(endDate.includes("T") ? endDate : `${endDate}T23:59:59`) : null;

    const event = await prisma.schoolEvent.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startDate: parsedStart,
        endDate: parsedEnd,
        allDay: allDay ?? true,
        startTime: startTime || null,
        endTime: endTime || null,
        type: (type as SchoolEventType) ?? "EVENT",
        color: color ?? "#059669",
        schoolId,
        createdById: userId ?? undefined,
      },
    });

    return NextResponse.json({ event });
  } catch (e) {
    console.error("[POST /api/calendar/events]", e);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}