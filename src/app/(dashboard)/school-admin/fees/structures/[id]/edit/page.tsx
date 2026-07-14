import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import { FeeStructureForm }  from "@/components/school-admin/fee-structure-form";
import { notFound }          from "next/navigation";
import Link from "next/link"; import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Edit Fee Structure" };
interface Props { params: Promise<{ id: string }> }

// Note: updateFeeStructure action is similar to create — add if needed
// For Phase 3 we redirect to structures list after edit
// Full update action can be added in Phase 4

export default async function EditFeeStructurePage({ params }: Props) {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const schoolId = dbUser?.schoolId ?? "";
  const { id } = await params;

  const [structure, categories, classes] = await Promise.all([
    prisma.feeStructure.findFirst({ where: { id, schoolId } }),
    prisma.feeCategory.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);
  if (!structure) notFound();

  // Reuse createFeeStructure — delete-and-recreate pattern for Phase 3
  // (safe since edit page blocks structures with payments)
  const { createFeeStructure } = await import("@/action/fee.actions");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/fees/structures"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Fee Structure</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {categories.find((c) => c.id === structure.feeCategoryId)?.name}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <FeeStructureForm categories={categories} classes={classes}
          action={createFeeStructure}
          initialData={structure}
          mode="edit" />
      </div>
    </div>
  );
}