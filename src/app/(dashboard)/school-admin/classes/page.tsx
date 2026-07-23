import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RowActions } from "@/components/ui/row-actions";
import { deleteClass } from "@/action/class.actions";
import { Plus} from "lucide-react";
import { BookOpen} from "lucide-react";

export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: {
      _count: { select: { sections: true, subjects: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} class{classes.length !== 1 ? "es" : ""}</p>
        </div>
        <Link href="/school-admin/classes/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Class
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {classes.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No classes yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first class to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Class Name", "Sections", "Subjects", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-semibold text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                        {c._count.sections} section{c._count.sections !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full">
                        {c._count.subjects} subject{c._count.subjects !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/classes/${c.id}/edit`}
                        deleteAction={deleteClass.bind(null, c.id)}
                        entityLabel="class and all its sections"
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
