import { requireRole }   from "@/lib/session";
import { HolidayForm }   from "@/components/school-admin/holiday-form";
import { createHoliday } from "@/action/holiday.actions";
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";

export const metadata = { title: "Add Holiday" };

export default async function NewHolidayPage() {
  await requireRole(["SCHOOL_ADMIN"]);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/holidays"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Holiday</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add a public holiday or school break to the calendar
          </p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Teachers will be alerted</span> when
          trying to mark attendance on a date that is a holiday.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <HolidayForm action={createHoliday} mode="create" />
      </div>
    </div>
  );
}