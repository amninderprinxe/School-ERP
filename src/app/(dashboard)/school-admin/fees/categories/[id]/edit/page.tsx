import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import { FeeCategoryForm }   from "@/components/school-admin/fee-category-form";
import { updateFeeCategory } from "@/action/fee.actions";
import { notFound }          from "next/navigation";
import Link from "next/link"; import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Edit Fee Category" };
interface Props { params: Promise<{ id: string }> }

export default async function EditFeeCategoryPage({ params }: Props) {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const { id } = await params;

  const category = await prisma.feeCategory.findFirst({
    where: { id, schoolId: dbUser?.schoolId ?? "" },
  });
  if (!category) notFound();

  const boundAction = updateFeeCategory.bind(null, category.id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/fees/categories"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Fee Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">{category.name}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <FeeCategoryForm action={boundAction} initialData={category} mode="edit" />
      </div>
    </div>
  );
}
