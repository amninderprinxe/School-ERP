import { requireRole }         from "@/lib/session";
import { FeeCategoryForm }     from "@/components/school-admin/fee-category-form";
import { createFeeCategory }   from "@/action/fee.actions";
import Link from "next/link"; import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Add Fee Category" };

export default async function NewFeeCategoryPage() {
  await requireRole(["SCHOOL_ADMIN"]);
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/fees/categories"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Fee Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">e.g. Tuition, Transport, Library</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <FeeCategoryForm action={createFeeCategory} mode="create" />
      </div>
    </div>
  );
}