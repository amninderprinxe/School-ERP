import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma as rawPrisma }       from "@/lib/db";
import type { SchoolEventType }      from "@prisma/client";

const prisma = rawPrisma as any;

export const dynamic = "force-dynamic";

// ── Color palette per event type ──────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  exam:         "#7c3aed",
  ptm:          "#2563eb",
  holiday:      "#dc2626",
  birthday:     "#db2777",
  fee:          "#d97706",
  school_event: "#059669",
  announcement: "#0891b2",
};

// ── Birthday helper — recurring annual ────────────────────────────

function birthdayInRange(
  dob:   Date,
  start: Date,
  end:   Date,
): Date[] {
  const hits: Date[] = [];
  for (let yr = start.getFullYear(); yr <= end.getFullYear(); yr++) {
    const bd = new Date(Date.UTC(yr, dob.getUTCMonth(), dob.getUTCDate()));
    if (bd >= start && bd <= end) hits.push(bd);
  }
  return hits;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

// ─────────────────────────────────────────────────────────────────
// GET — fetch all events in date range
// ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const sp        = request.nextUrl.searchParams;
  const startStr  = sp.get("start");
  const endStr    = sp.get("end");
  const typesStr  = sp.get("types");   // comma-separated filter

  if (!startStr || !endStr) {
    return NextResponse.json({ events: [] });
  }

  const role      = session.user.role;
  const userId    = session.user.id;
  const schoolId  = session.user.schoolId ?? "";
  const start     = new Date(startStr);
  const end       = new Date(endStr);
  const typeFilter = typesStr ? typesStr.split(",") : null;

  const want = (t: string) => !typeFilter || typeFilter.includes(t);

  const events: Record<string, unknown>[] = [];

  // ── SCHOOL_ADMIN ─────────────────────────────────────────────

  if ((role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN") && schoolId) {
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
      want("exam") ? prisma.exam.findMany({
        where: {
          schoolId,
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate:   { gte: start, lte: end } },
          ],
        },
        include: { class: { select: { name: true } } },
      }) : [],

      // PTM slots
      want("ptm") ? prisma.ptmSlot.findMany({
        where: { schoolId, date: { gte: start, lte: end } },
        include: {
          teacherProfile: { include: { user: { select: { name: true } } } },
          booking: {
            include: {
              studentProfile: { include: { user: { select: { name: true } } } },
            },
          },
        },
      }) : [],

      // Holidays
      want("holiday") ? prisma.holiday.findMany({
        where: { schoolId, date: { gte: start, lte: end } },
      }) : [],

      // Fee due dates
      want("fee") ? prisma.feeStructure.findMany({
        where: {
          schoolId,
          dueDate: { gte: start, lte: end },
        },
        include: { feeCategory: { select: { name: true } } },
      }) : [],

      // School events (custom)
      want("school_event") ? prisma.schoolEvent.findMany({
        where: {
          schoolId,
          OR: [
            { startDate: { gte: start, lte: end } },
            { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
            { AND: [{ startDate: { lte: end }   }, { endDate: { gte: start } }] },
          ],
        },
        include: { createdBy: { select: { name: true } } },
      }) : [],

      // Student birthdays (all — filter by date in JS)
      want("birthday") ? prisma.studentProfile.findMany({
        where:  { user: { schoolId, isActive: true }, dateOfBirth: { not: null } },
        include: {
          user:    { select: { name: true } },
          section: { include: { class: { select: { name: true } } } },
        },
      }) : [],

      // Recent announcements
      want("announcement") ? prisma.announcement.findMany({
        where: { schoolId, createdAt: { gte: start, lte: end } },
      }) : [],
    ]);

    // ── Transform Exams ──────────────────────────────────────────
    for (const e of exams) {
      events.push({
        id:        `exam-${e.id}`,
        title:     e.name,
        start:     e.startDate ? toISO(e.startDate) : toISO(new Date(e.createdAt)),
        end:       e.endDate   ? toISO(e.endDate)   : undefined,
        allDay:    true,
        color:     TYPE_COLOR.exam,
        textColor: "#fff",
        editable:  false,
        extendedProps: {
          type:        "exam",
          examType:    e.examType,
          className:   e.class.name,
          description: `${e.examType.replace(/_/g, " ")} · ${e.class.name}`,
          editable:    false,
          entityId:    e.id,
        },
      });
    }

    // ── Transform PTM slots ──────────────────────────────────────
    for (const s of ptmSlots) {
      const dateStr  = toISO(s.date);
      const teacher  = s.teacherProfile.user.name;
      const booked   = !!s.booking;
      events.push({
        id:        `ptm-${s.id}`,
        title:     booked
          ? `PTM: ${s.booking!.studentProfile.user.name} → ${teacher}`
          : `PTM Slot: ${teacher}`,
        start:     s.startTime ? `${dateStr}T${s.startTime}:00` : dateStr,
        end:       s.endTime   ? `${dateStr}T${s.endTime}:00`   : undefined,
        allDay:    !s.startTime,
        color:     booked ? TYPE_COLOR.ptm : "#93c5fd",
        textColor: booked ? "#fff" : "#1e40af",
        editable:  false,
        extendedProps: {
          type:        "ptm",
          booked,
          teacher,
          student:     s.booking?.studentProfile?.user.name,
          description: booked
            ? `${s.booking!.studentProfile.user.name} with ${teacher}`
            : `Available slot for ${teacher}`,
          notes:       s.notes,
          entityId:    s.id,
          editable:    false,
        },
      });
    }

    // ── Transform Holidays ───────────────────────────────────────
    for (const h of holidays) {
      events.push({
        id:        `holiday-${h.id}`,
        title:     `🎌 ${h.name}`,
        start:     toISO(h.date),
        allDay:    true,
        color:     TYPE_COLOR.holiday,
        textColor: "#fff",
        editable:  true,    // admin can drag holidays
        extendedProps: {
          type:        "holiday",
          holidayType: h.type,
          description: h.description ?? h.type.replace(/_/g, " "),
          entityId:    h.id,
          editable:    true,
        },
      });
    }

    // ── Transform Fee due dates ──────────────────────────────────
    for (const f of feeStructures) {
      if (!f.dueDate) continue;
      events.push({
        id:        `fee-${f.id}`,
        title:     `💳 ${f.feeCategory.name} Due`,
        start:     toISO(f.dueDate),
        allDay:    true,
        color:     TYPE_COLOR.fee,
        textColor: "#fff",
        editable:  false,
        extendedProps: {
          type:        "fee",
          amount:      f.amount,
          academicYear: f.academicYear,
          description: `₹${f.amount.toLocaleString("en-IN")} · ${f.academicYear}`,
          entityId:    f.id,
          editable:    false,
        },
      });
    }

    // ── Transform School Events ──────────────────────────────────
    for (const e of schoolEvents) {
      const startISO = e.startTime
        ? `${toISO(e.startDate)}T${e.startTime}:00`
        : toISO(e.startDate);
      const endISO   = e.endDate
        ? (e.endTime ? `${toISO(e.endDate)}T${e.endTime}:00` : toISO(e.endDate))
        : undefined;
      events.push({
        id:        `event-${e.id}`,
        title:     e.title,
        start:     startISO,
        end:       endISO,
        allDay:    e.allDay,
        color:     e.color ?? TYPE_COLOR.school_event,
        textColor: "#fff",
        editable:  true,
        extendedProps: {
          type:        "school_event",
          eventType:   e.type,
          description: e.description,
          createdBy:   e.createdBy.name,
          entityId:    e.id,
          editable:    true,
        },
      });
    }

    // ── Transform Student Birthdays ──────────────────────────────
    for (const sp of studentBirthdays) {
      if (!sp.dateOfBirth) continue;
      const dates = birthdayInRange(sp.dateOfBirth, start, end);
      for (const bd of dates) {
        events.push({
          id:        `birthday-${sp.id}-${bd.getFullYear()}`,
          title:     `🎂 ${sp.user.name}`,
          start:     toISO(bd),
          allDay:    true,
          color:     TYPE_COLOR.birthday,
          textColor: "#fff",
          editable:  false,
          extendedProps: {
            type:        "birthday",
            className:   sp.section?.class.name,
            section:     sp.section?.name,
            description: `${sp.user.name}'s Birthday${sp.section ? ` · ${sp.section.class.name}-${sp.section.name}` : ""}`,
            editable:    false,
          },
        });
      }
    }

    // ── Transform Announcements ──────────────────────────────────
    for (const a of announcements) {
      events.push({
        id:        `ann-${a.id}`,
        title:     `📢 ${a.title}`,
        start:     toISO(a.createdAt),
        allDay:    true,
        color:     TYPE_COLOR.announcement,
        textColor: "#fff",
        editable:  false,
        extendedProps: {
          type:        "announcement",
          description: a.content.slice(0, 120),
          entityId:    a.id,
          editable:    false,
        },
      });
    }
  }

  // ── TEACHER ──────────────────────────────────────────────────

  if (role === "TEACHER" && schoolId) {
    const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (tp) {
      const [myPTM, holidays, exams, schoolEvents] = await Promise.all([
        prisma.ptmSlot.findMany({
          where: { teacherProfileId: tp.id, date: { gte: start, lte: end } },
          include: {
            booking: {
              include: {
                studentProfile: { include: { user: { select: { name: true } } } },
              },
            },
          },
        }),
        prisma.holiday.findMany({ where: { schoolId, date: { gte: start, lte: end } } }),
        prisma.exam.findMany({
          where: { schoolId, startDate: { gte: start, lte: end } },
          include: { class: { select: { name: true } } },
        }),
        prisma.schoolEvent.findMany({
          where: { schoolId, startDate: { gte: start, lte: end } },
        }),
      ]);

      for (const s of myPTM) {
        const dateStr = toISO(s.date);
        events.push({
          id:        `ptm-${s.id}`,
          title:     s.booking
            ? `PTM: ${s.booking.studentProfile.user.name}`
            : `PTM Slot (Available)`,
          start:     s.startTime ? `${dateStr}T${s.startTime}:00` : dateStr,
          end:       s.endTime   ? `${dateStr}T${s.endTime}:00`   : undefined,
          allDay:    !s.startTime,
          color:     s.booking ? TYPE_COLOR.ptm : "#93c5fd",
          textColor: s.booking ? "#fff" : "#1e40af",
          editable:  false,
          extendedProps: {
            type:        "ptm",
            booked:      !!s.booking,
            student:     s.booking?.studentProfile?.user.name,
            description: s.booking
              ? `Meeting for ${s.booking.studentProfile.user.name}`
              : "Available PTM slot",
            editable:    false,
          },
        });
      }

      for (const h of holidays) {
        events.push({
          id: `holiday-${h.id}`, title: `🎌 ${h.name}`, start: toISO(h.date),
          allDay: true, color: TYPE_COLOR.holiday, textColor: "#fff", editable: false,
          extendedProps: { type: "holiday", description: h.type, editable: false },
        });
      }

      for (const e of exams) {
        if (!e.startDate) continue;
        events.push({
          id: `exam-${e.id}`, title: e.name, start: toISO(e.startDate),
          end: e.endDate ? toISO(e.endDate) : undefined,
          allDay: true, color: TYPE_COLOR.exam, textColor: "#fff", editable: false,
          extendedProps: {
            type: "exam", className: e.class.name,
            description: `${e.examType.replace(/_/g, " ")} · ${e.class.name}`,
            editable: false,
          },
        });
      }

      for (const e of schoolEvents) {
        events.push({
          id: `event-${e.id}`, title: e.title,
          start: toISO(e.startDate), end: e.endDate ? toISO(e.endDate) : undefined,
          allDay: true, color: e.color ?? TYPE_COLOR.school_event, textColor: "#fff", editable: false,
          extendedProps: { type: "school_event", description: e.description, editable: false },
        });
      }
    }
  }

  // ── STUDENT ──────────────────────────────────────────────────

  if (role === "STUDENT" && schoolId) {
    const sp = await prisma.studentProfile.findUnique({
      where:   { userId },
      include: { section: { include: { class: true } } },
    });

    if (sp) {
      const [exams, fees, holidays, schoolEvents] = await Promise.all([
        prisma.exam.findMany({
          where: {
            classId:  sp.section?.classId ?? "",
            schoolId,
            startDate: { gte: start, lte: end },
          },
          include: { class: { select: { name: true } } },
        }),
        prisma.feePayment.findMany({
          where: { studentProfileId: sp.id },
          include: {
            feeStructure: {
              where:   { dueDate: { gte: start, lte: end } },
              include: { feeCategory: { select: { name: true } } },
            },
          },
        }),
        prisma.holiday.findMany({ where: { schoolId, date: { gte: start, lte: end } } }),
        prisma.schoolEvent.findMany({
          where: { schoolId, startDate: { gte: start, lte: end } },
        }),
      ]);

      for (const e of exams) {
        if (!e.startDate) continue;
        events.push({
          id: `exam-${e.id}`, title: e.name, start: toISO(e.startDate),
          end: e.endDate ? toISO(e.endDate) : undefined,
          allDay: true, color: TYPE_COLOR.exam, textColor: "#fff", editable: false,
          extendedProps: {
            type: "exam", className: e.class.name,
            description: `${e.examType.replace(/_/g, " ")} · ${e.class.name}`,
            editable: false,
          },
        });
      }

      for (const p of fees) {
        if (!p.feeStructure?.dueDate) continue;
        events.push({
          id: `fee-${p.id}`, title: `💳 ${p.feeStructure.feeCategory.name} Due`,
          start: toISO(p.feeStructure.dueDate), allDay: true,
          color: p.status === "PAID" ? "#94a3b8" : TYPE_COLOR.fee, textColor: "#fff", editable: false,
          extendedProps: {
            type: "fee", status: p.status,
            description: `₹${p.feeStructure.amount.toLocaleString("en-IN")} · ${p.status}`,
            editable: false,
          },
        });
      }

      for (const h of holidays) {
        events.push({
          id: `holiday-${h.id}`, title: `🎌 ${h.name}`, start: toISO(h.date),
          allDay: true, color: TYPE_COLOR.holiday, textColor: "#fff", editable: false,
          extendedProps: { type: "holiday", description: h.type, editable: false },
        });
      }

      for (const e of schoolEvents) {
        events.push({
          id: `event-${e.id}`, title: e.title,
          start: toISO(e.startDate), end: e.endDate ? toISO(e.endDate) : undefined,
          allDay: true, color: e.color ?? TYPE_COLOR.school_event, textColor: "#fff", editable: false,
          extendedProps: { type: "school_event", description: e.description, editable: false },
        });
      }
    }
  }

  return NextResponse.json({ events });
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
    const body      = await request.json();
    const { title, description, startDate, endDate, allDay, startTime, endTime, type, color } = body;

    if (!title?.trim() || !startDate) {
      return NextResponse.json({ error: "Title and start date required" }, { status: 400 });
    }

    const event = await prisma.schoolEvent.create({
      data: {
        title:       title.trim(),
        description: description?.trim() || null,
        startDate:   new Date(startDate),
        endDate:     endDate ? new Date(endDate) : null,
        allDay:      allDay ?? true,
        startTime:   startTime || null,
        endTime:     endTime   || null,
        type:        (type as SchoolEventType) ?? "EVENT",
        color:       color ?? "#059669",
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