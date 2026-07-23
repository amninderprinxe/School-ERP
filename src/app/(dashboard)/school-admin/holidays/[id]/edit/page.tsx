import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import { HolidayForm }   from "@/components/school-admin/holiday-form";
import { updateHoliday } from "@/action/holiday.actions";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";
import { HOLIDAY_TYPE_LABELS } from "@/lib/validations/holiday";
import type { HolidayType }    from "@prisma/client";

export const metadata = { title: "Edit Holiday" };

interface Props { params: Promise<{ id: string }> }

export default async function EditHolidayPage({ params }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser   = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const { id } = await params;

  const holiday = await prisma.holiday.findFirst({
    where: { id, schoolId: dbUser?.schoolId ?? "" },
  });
  if (!holiday) notFound();

  const boundAction = updateHoliday.bind(null, holiday.id);

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Holiday</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {holiday.name} ·{" "}
            {HOLIDAY_TYPE_LABELS[holiday.type as HolidayType]}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <HolidayForm
          action={boundAction}
          initialData={{
            name:        holiday.name,
            date:        holiday.date,
            type:        holiday.type,
            description: holiday.description,
          }}
          mode="edit"
        />
      </div>
    </div>
  );
}