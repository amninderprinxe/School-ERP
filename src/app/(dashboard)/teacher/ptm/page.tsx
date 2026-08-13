import { requireRole }     from "@/lib/session";
import { prisma }          from "@/lib/db";
import {
  PTM_STATUS_LABELS,
  PTM_STATUS_STYLE,
}                          from "@/lib/validations/ptm";
import { PtmMeetingForm }  from "@/components/teacher/ptm-meeting-form";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Users2,
}                          from "lucide-react";
import type { PtmStatus }  from "@prisma/client";

export const metadata = { title: "My PTM Schedule" };

function formatSlotDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday:  "long",
    day:      "numeric",
    month:    "long",
    year:     "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default async function TeacherPtmPage() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: { user: { select: { name: true } } },
  });

  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-500">
          Teacher profile not found. Contact your school admin.
        </p>
      </div>
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Load all slots for this teacher, upcoming and recent
  const slots = await prisma.ptmSlot.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
      schoolId,
      date: { gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)) },
    },
    include: {
      booking: {
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true } },
              section: { include: { class: true } },
            },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Stats
  const totalMeetings = slots.filter((s) => s.booking).length;
  const scheduled     = slots.filter((s) => s.booking?.status === "SCHEDULED").length;
  const completed     = slots.filter((s) => s.booking?.status === "COMPLETED").length;
  const available     = slots.filter((s) => !s.isBooked).length;

  // Group by date
  const byDate = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = new Date(s.date).toISOString().split("T")[0]!;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My PTM Schedule
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Teacher-student meeting appointments
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Slots",   value: slots.length,   icon: CalendarClock, color: "text-indigo-700", bg: "bg-indigo-50" },
          { label: "Booked",        value: totalMeetings,  icon: Users2,        color: "text-amber-700",  bg: "bg-amber-50"  },
          { label: "Scheduled",     value: scheduled,      icon: Clock,         color: "text-blue-700",   bg: "bg-blue-50"   },
          { label: "Completed",     value: completed,      icon: CheckCircle2,  color: "text-green-700",  bg: "bg-green-50"  },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm
              p-4 flex items-start gap-3"
          >
            <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center
              justify-center shrink-0 mt-0.5`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Schedule ───────────────────────────────────────── */}
      {slots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No PTM slots scheduled for you yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ask your school admin to create PTM slots for your calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(byDate.entries()).map(([dateKey, daySlots]) => (
            <div
              key={dateKey}
              className="bg-white rounded-xl border border-gray-100 shadow-sm
                overflow-hidden"
            >
              {/* Date header */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800">
                  {formatSlotDate(new Date(`${dateKey}T00:00:00.000Z`))}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {daySlots.filter((s) => s.isBooked).length} booked ·{" "}
                  {daySlots.filter((s) => !s.isBooked).length} available
                </p>
              </div>

              {/* Slots */}
              <div className="divide-y divide-gray-50">
                {daySlots.map((slot) => (
                  <div key={slot.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start gap-4">

                      {/* Time badge */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>

                      {/* Slot details */}
                      {slot.booking ? (
                        <div className="flex-1 min-w-0">
                          {/* Student */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {slot.booking.studentProfile.user.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {slot.booking.studentProfile.section
                                  ? `${slot.booking.studentProfile.section.class.name} — Section ${slot.booking.studentProfile.section.name}`
                                  : "Student"}
                              </p>
                            </div>
                            <span
                              className={`ml-auto px-2.5 py-1 text-xs font-semibold
                                rounded-full ${PTM_STATUS_STYLE[slot.booking.status as PtmStatus]}`}
                            >
                              {PTM_STATUS_LABELS[slot.booking.status as PtmStatus]}
                            </span>
                          </div>

                          {/* Teacher note (existing) */}
                          {slot.booking.teacherNote && (
                            <p className="text-xs text-blue-700 mt-1.5 p-2
                              bg-blue-50 rounded-lg font-medium">
                              Your note: "{slot.booking.teacherNote}"
                            </p>
                          )}

                          {/* Update form */}
                          {slot.booking.status === "SCHEDULED" && (
                            <PtmMeetingForm
                              meetingId={slot.booking.id}
                              currentStatus={slot.booking.status as PtmStatus}
                              currentNote={slot.booking.teacherNote}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1
                          text-xs font-semibold bg-green-50 text-green-700
                          border border-green-200 rounded-full ml-auto">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Admin notes */}
                    {slot.notes && (
                      <p className="text-xs text-gray-400 mt-2 pl-6">
                        📌 {slot.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}