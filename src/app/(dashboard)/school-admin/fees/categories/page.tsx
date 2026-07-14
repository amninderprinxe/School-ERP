import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import Link                   from "next/link";
import { RowActions }         from "@/components/ui/row-actions";
import { deleteFeeCategory }  from "@/action/fee.actions";
import { Tag, Plus }          from "lucide-react";

export const metadata = { title: "Fee Categories" };

export default async function FeeCategoriesPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return <p className="p-8 text-red-500">No school assigned.</p>;

  const categories = await prisma.feeCategory.findMany({
    where:   { schoolId },
    include: { _count: { select: { feeStructures: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Link href="/school-admin/fees/categories/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" />Add Category
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No fee categories yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create categories like Tuition, Transport, Library first.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Category Name", "Description", "Structures", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500
                      uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat, i) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center
                          justify-center shrink-0">
                          <Tag className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {cat.description ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-indigo-50
                        text-indigo-700 rounded-full">
                        {cat._count.feeStructures} structure{cat._count.feeStructures !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/fees/categories/${cat.id}/edit`}
                        deleteAction={deleteFeeCategory.bind(null, cat.id)}
                        entityLabel="fee category"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}