import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";
import { RolloverForm }  from "@/components/school-admin/rollover-form";

export const metadata = { title: "Year Rollover" };

interface Props {
  searchParams: Promise<{ fromYearId?: string }>;
}

export default async function RolloverPage({ searchParams }: Props) {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId  = dbUser?.schoolId;
  const sp        = await searchParams;
  const fromYearId = sp.fromYearId;

  if (!schoolId || !fromYearId) notFound();

  const sourceYear = await prisma.academicYear.findFirst({
    where:  { id: fromYearId, schoolId },
    select: { id: true, name: true },
  });
  if (!sourceYear) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/academic-years"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Year Rollover
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a new year and optionally copy the timetable from{" "}
            {sourceYear.name}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <RolloverForm sourceYear={sourceYear} />
      </div>

      {/* What happens info box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          What the rollover does:
        </p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            Creates a new academic year record
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            Sets the new year as current (unsets the old one)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            Optionally copies all timetable periods to the new year
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0">✗</span>
            Does NOT copy exams or results (each year has fresh exams)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0">✗</span>
            Does NOT copy fee structures (create new fee structures for
            the new year)
          </li>
        </ul>
      </div>
    </div>
  );
}