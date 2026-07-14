import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { FeeStructureForm }   from "@/components/school-admin/fee-structure-form";
import { createFeeStructure } from "@/action/fee.actions";
import Link from "next/link"; import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New Fee Structure" };

export default async function NewFeeStructurePage() {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return <p className="p-8 text-red-500">No school assigned.</p>;

  const [categories, classes] = await Promise.all([
    prisma.feeCategory.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/fees/structures"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Fee Structure</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define the amount and terms for a fee</p>
        </div>
      </div>
      {categories.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700">
            No fee categories found.{" "}
            <Link href="/school-admin/fees/categories/new" className="underline font-semibold">
              Create a category first.
            </Link>
          </p>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <FeeStructureForm categories={categories} classes={classes}
          action={createFeeStructure} mode="create" />
      </div>
    </div>
  );
}