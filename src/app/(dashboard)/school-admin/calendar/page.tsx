"use client";

import { requireRole } from "@/lib/session";
import dynamic         from "next/dynamic";
import { CalendarDays, Loader2 } from "lucide-react";
import { CalendarWrapper } from "@/components/calendar/calendar-wrapper";
import { CalendarClient } from "@/components/calendar/calendar-client";
export const metadata = { title: "Calendar — Campus-X" };


export default async function CalendarPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600
              rounded-xl flex items-center justify-center shadow-sm">
              <CalendarDays className="w-4.5 h-4.5 text-white" aria-hidden />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              School Calendar
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Exams, PTM, holidays, events and more — all in one place
          </p>
        </div>
      </div>


      {/* ── Calendar ──────────────────────────────────────── */}
      <CalendarClient role={user.role} canCreate={user.role === "SCHOOL_ADMIN"} />
      <CalendarWrapper role={"SCHOOL_ADMIN"} canCreate={false} />
    </div>
  );
}