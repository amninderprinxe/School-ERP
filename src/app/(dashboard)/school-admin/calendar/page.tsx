import { requireRole } from "@/lib/session";
import dynamic from "next/dynamic";
import { CalendarDays, Loader2 } from "lucide-react";

// 🔴 FIX: Dynamically import CalendarClient with SSR disabled
const CalendarClient = dynamic(
  () =>
    import("@/components/calendar/calendar-client").then(
      (mod) => mod.CalendarClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">
          Loading Calendar...
        </p>
      </div>
    ),
  }
);

export const metadata = { title: "Calendar — Campus-X" };

export default async function CalendarPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
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
      <CalendarClient
        role={user.role}
        canCreate={user.role === "SCHOOL_ADMIN"}
      />
    </div>
  );
}