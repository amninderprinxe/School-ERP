import { requireRole }         from "@/lib/session";
import { AcademicYearForm }    from "@/components/school-admin/academic-year-form";
import { createAcademicYear }  from "@/action/academic-year.actions";
import Link                    from "next/link";
import { ArrowLeft }           from "lucide-react";

export const metadata = { title: "Add Academic Year" };

export default async function NewAcademicYearPage() {
  await requireRole(["SCHOOL_ADMIN"]);

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
            Add Academic Year
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            e.g. 2025-26 · June 2025 to March 2026
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <AcademicYearForm action={createAcademicYear} mode="create" />
      </div>
    </div>
  );
}