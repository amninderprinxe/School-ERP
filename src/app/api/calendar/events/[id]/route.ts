import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import { revalidatePath }            from "next/cache";

// ── PATCH — update event dates (drag-drop / resize) ───────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "SCHOOL_ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const { id }   = await params;
  const schoolId = session.user.schoolId ?? "";

  // Only school_events are editable via drag-drop
  // id format: "event-{dbId}" or bare dbId
  const dbId = id.startsWith("event-") ? id.slice(6) : id;

  try {
    const body = await request.json();
    const { startDate, endDate, allDay } = body;

    // Verify ownership
    const existing = await prisma.schoolEvent.findFirst({
      where: { id: dbId, schoolId },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    await prisma.schoolEvent.update({
      where: { id: dbId },
      data:  {
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate:   endDate   ? new Date(endDate)   : null,
        allDay:    allDay    !== undefined ? allDay : existing.allDay,
      },
    });

    // Also support updating holidays (for drag-drop)
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/calendar/events/[id]]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "SCHOOL_ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const { id }   = await params;
  const schoolId = session.user.schoolId ?? "";
  const dbId     = id.startsWith("event-") ? id.slice(6) : id;

  try {
    const existing = await prisma.schoolEvent.findFirst({
      where: { id: dbId, schoolId },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    await prisma.schoolEvent.delete({ where: { id: dbId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}