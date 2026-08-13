import { requireRole } from "@/lib/session";
import { CalendarDays } from "lucide-react";
import { CalendarWrapper } from "@/components/calendar/calendar-wrapper";

export const metadata = { title: "Calendar" };

export default async function TeacherCalendarPage() {
  const user = await requireRole(["TEACHER"]);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600
          rounded-xl flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-white" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-gray-500">
            Your schedule — exams, PTM, holidays and school events
          </p>
        </div>
      </div>
      <CalendarWrapper role={user.role as "TEACHER"} canCreate={false} />
    </div>
  );
}