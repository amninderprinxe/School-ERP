import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma as rawPrisma } from "@/lib/db";
import type { SchoolEventType } from "@prisma/client";

const prisma = rawPrisma as any;

export const dynamic = "force-dynamic";

// ── Color palette per event type ──────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  exam: "#7c3aed",
  ptm: "#2563eb",
  holiday: "#dc2626",
  birthday: "#db2777",
  fee: "#d97706",
  school_event: "#059669",
  announcement: "#0891b2",
};

// ── Birthday helper — recurring annual ────────────────────────────

function birthdayInRange(dob: Date, start: Date, end: Date): Date[] {
  const hits: Date[] = [];
  try {
    const dobObj = new Date(dob);
    if (isNaN(dobObj.getTime())) return hits;
    for (let yr = start.getFullYear(); yr <= end.getFullYear(); yr++) {
      const bd = new Date(Date.UTC(yr, dobObj.getUTCMonth(), dobObj.getUTCDate()));
      if (bd >= start && bd <= end) hits.push(bd);
    }
  } catch (e) {
    console.error("[birthdayInRange]", e);
  }
  return hits;
}

// ── Timezone-Safe Local YYYY-MM-DD Formatter ──────────────────────
function toISO(d: Date | string): string {
  try {
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return d;
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return new Date().toISOString().split("T")[0]!;

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0]!;
  }
}

// ─────────────────────────────────────────────────────────────────
// GET — fetch all events in date range
// ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json([], { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const startStr = sp.get("start");
    const endStr = sp.get("end");
    const typesStr = sp.get("types");

    if (!startStr || !endStr) {
      return NextResponse.json([]);
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    // Validate dates to avoid Prisma execution errors
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json([]);
    }

    // Widen filter boundaries by 1 day buffer to handle timezone offsets cleanly
    const safeStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const safeEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    const role = session.user.role;
    const userId = session.user.id;
    const schoolId = session.user.schoolId ?? "";
    const typeFilter = typesStr ? typesStr.toLowerCase().split(",") : null;

    const want = (t: string) =>
      !typeFilter ||
      typeFilter.includes(t.toLowerCase()) ||
      (t === "school_event" && (typeFilter.includes("event") || typeFilter.includes("school_event")));

    const events: Record<string, unknown>[] = [];

    if (!schoolId) {
      return NextResponse.json([]);
    }

    // ── SCHOOL_ADMIN & SUPER_ADMIN ────────────────────────────────

    if (role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN") {
      const [
        exams,
        ptmSlots,
        holidays,
        feeStructures,
        schoolEvents,
        studentBirthdays,
        announcements,
      ] = await Promise.all([
        // Exams
        want("exam")
          ? prisma.exam
              .findMany({
                where: {
                  schoolId,
                  OR: [
                    { startDate: { gte: safeStart, lte: safeEnd } },
                    { endDate: { gte: safeStart, lte: safeEnd } },
                  ],
                },
                include: { class: { select: { name: true } } },
              })
              .catch(() => [])
          : [],

        // PTM slots
        want("ptm")
          ? prisma.ptmSlot
              .findMany({
                where: { schoolId, date: { gte: safeStart, lte: safeEnd } },
                include: {
                  teacherProfile: { include: { user: { select: { name: true } } } },
                  booking: {
                    include: {
                      studentProfile: { include: { user: { select: { name: true } } } },
                    },
                  },
                },
              })
              .catch(() => [])
          : [],

        // Holidays
        want("holiday")
          ? prisma.holiday
              .findMany({
                where: { schoolId, date: { gte: safeStart, lte: safeEnd } },
              })
              .catch(() => [])
          : [],

        // Fee due dates
        want("fee")
          ? prisma.feeStructure
              .findMany({
                where: {
                  schoolId,
                  dueDate: { gte: safeStart, lte: safeEnd },
                },
                include: { feeCategory: { select: { name: true } } },
              })
              .catch(() => [])
          : [],

        // School events
        want("school_event")
          ? prisma.schoolEvent
              .findMany({
                where: {
                  schoolId,
                  OR: [
                    { startDate: { gte: safeStart, lte: safeEnd } },
                    { AND: [{ startDate: { lte: safeStart } }, { endDate: { gte: safeEnd } }] },
                    { AND: [{ startDate: { lte: safeEnd } }, { endDate: { gte: safeStart } }] },
                  ],
                },
                include: { createdBy: { select: { name: true } } },
              })
              .catch(() => [])
          : [],

        // Student birthdays
        want("birthday")
          ? prisma.studentProfile
              .findMany({
                where: { user: { schoolId, isActive: true }, dateOfBirth: { not: null } },
                include: {
                  user: { select: { name: true } },
                  section: { include: { class: { select: { name: true } } } },
                },
              })
              .catch(() => [])
          : [],

        // Announcements
        want("announcement")
          ? prisma.announcement
              .findMany({
                where: { schoolId, createdAt: { gte: safeStart, lte: safeEnd } },
              })
              .catch(() => [])
          : [],
      ]);

      // ── Transform Exams ──
      for (const e of exams) {
        events.push({
          id: `exam-${e.id}`,
          title: e.name,
          start: e.startDate ? toISO(e.startDate) : toISO(new Date(e.createdAt)),
          end: e.endDate ? toISO(e.endDate) : undefined,
          allDay: true,
          color: TYPE_COLOR.exam,
          textColor: "#fff",
          editable: false,
          extendedProps: {
            type: "exam",
            examType: e.examType,
            className: e.class?.name ?? "",
            description: `${e.examType?.replace(/_/g, " ") ?? "Exam"} · ${e.class?.name ?? ""}`,
            editable: false,
            entityId: e.id,
          },
        });
      }

      // ── Transform PTM slots ──
      for (const s of ptmSlots) {
        const dateStr = toISO(s.date);
        const teacher = s.teacherProfile?.user?.name ?? "Teacher";
        const booked = !!s.booking;
        events.push({
          id: `ptm-${s.id}`,
          title: booked
            ? `PTM: ${s.booking?.studentProfile?.user?.name ?? "Student"} → ${teacher}`
            : `PTM Slot: ${teacher}`,
          start: s.startTime ? `${dateStr}T${s.startTime}:00` : dateStr,
          end: s.endTime ? `${dateStr}T${s.endTime}:00` : undefined,
          allDay: !s.startTime,
          color: booked ? TYPE_COLOR.ptm : "#93c5fd",
          textColor: booked ? "#fff" : "#1e40af",
          editable: false,
          extendedProps: {
            type: "ptm",
            booked,
            teacher,
            student: s.booking?.studentProfile?.user?.name,
            description: booked
              ? `${s.booking?.studentProfile?.user?.name} with ${teacher}`
              : `Available slot for ${teacher}`,
            notes: s.notes,
            entityId: s.id,
            editable: false,
          },
        });
      }

      // ── Transform Holidays ──
      for (const h of holidays) {
        events.push({
          id: `holiday-${h.id}`,
          title: `🎌 ${h.name}`,
          start: toISO(h.date),
          allDay: true,
          color: TYPE_COLOR.holiday,
          textColor: "#fff",
          editable: true,
          extendedProps: {
            type: "holiday",
            holidayType: h.type,
            description: h.description ?? h.type?.replace(/_/g, " "),
            entityId: h.id,
            editable: true,
          },
        });
      }

      // ── Transform Fee due dates ──
      for (const f of feeStructures) {
        if (!f.dueDate) continue;
        events.push({
          id: `fee-${f.id}`,
          title: `💳 ${f.feeCategory?.name ?? "Fee"} Due`,
          start: toISO(f.dueDate),
          allDay: true,
          color: TYPE_COLOR.fee,
          textColor: "#fff",
          editable: false,
          extendedProps: {
            type: "fee",
            amount: f.amount,
            academicYear: f.academicYear,
            description: `₹${f.amount?.toLocaleString("en-IN") ?? 0} · ${f.academicYear ?? ""}`,
            entityId: f.id,
            editable: false,
          },
        });
      }

      // ── Transform School Events ──
      for (const e of schoolEvents) {
        const startISO = e.startTime
          ? `${toISO(e.startDate)}T${e.startTime}:00`
          : toISO(e.startDate);
        const endISO = e.endDate
          ? e.endTime
            ? `${toISO(e.endDate)}T${e.endTime}:00`
            : toISO(e.endDate)
          : undefined;
        events.push({
          id: `event-${e.id}`,
          title: e.title,
          start: startISO,
          end: endISO,
          allDay: e.allDay,
          color: e.color ?? TYPE_COLOR.school_event,
          textColor: "#fff",
          editable: true,
          extendedProps: {
            type: "school_event",
            eventType: e.type,
            description: e.description,
            createdBy: e.createdBy?.name ?? "Admin",
            entityId: e.id,
            editable: true,
          },
        });
      }

      // ── Transform Student Birthdays ──
      for (const sp of studentBirthdays) {
        if (!sp.dateOfBirth) continue;
        const dates = birthdayInRange(sp.dateOfBirth, start, end);
        for (const bd of dates) {
          events.push({
            id: `birthday-${sp.id}-${bd.getFullYear()}`,
            title: `🎂 ${sp.user?.name ?? "Student"}`,
            start: toISO(bd),
            allDay: true,
            color: TYPE_COLOR.birthday,
            textColor: "#fff",
            editable: false,
            extendedProps: {
              type: "birthday",
              className: sp.section?.class?.name,
              section: sp.section?.name,
              description: `${sp.user?.name}'s Birthday${sp.section ? ` · ${sp.section.class?.name}-${sp.section.name}` : ""}`,
              editable: false,
            },
          });
        }
      }

      // ── Transform Announcements ──
      for (const a of announcements) {
        events.push({
          id: `ann-${a.id}`,
          title: `📢 ${a.title}`,
          start: toISO(a.createdAt),
          allDay: true,
          color: TYPE_COLOR.announcement,
          textColor: "#fff",
          editable: false,
          extendedProps: {
            type: "announcement",
            description: a.content?.slice(0, 120),
            entityId: a.id,
            editable: false,
          },
        });
      }
    }

    // Always return array directly
    return NextResponse.json(events);
  } catch (error) {
    console.error("[CALENDAR_GET_ERROR]", error);
    return NextResponse.json([]);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST — create school event
// ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "SCHOOL_ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const schoolId = session.user.schoolId ?? "";
  if (!schoolId) return new NextResponse("No school assigned", { status: 400 });

  try {
    const body = await request.json();
    const { title, description, startDate, endDate, allDay, startTime, endTime, type, color } = body;

    if (!title?.trim() || !startDate) {
      return NextResponse.json({ error: "Title and start date required" }, { status: 400 });
    }

    // Cleanly construct Date objects without UTC shift
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
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ event });
  } catch (e) {
    console.error("[POST /api/calendar/events]", e);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}