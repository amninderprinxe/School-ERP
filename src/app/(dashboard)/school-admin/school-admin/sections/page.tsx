import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RowActions } from "@/components/ui/row-actions";
import { deleteSection } from "@/actions/section.actions";
import { Layers, Plus } from "lucide-react";

export const metadata = { title: "Sections" };

export default async function SectionsPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const sections = await prisma.section.findMany({
    where: { schoolId },
    include: {
      class: true,
      classTeacher: { include: { user: { select: { name: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sections.length} section{sections.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/school-admin/sections/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Section
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sections.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Create classes first, then add sections to them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Section", "Class", "Class Teacher", "Students", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-gray-900">Section {sec.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {sec.class.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-sm">
                      {sec.classTeacher?.user.name ?? <span className="text-gray-300 text-xs">Not assigned</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                        {sec._count.students} student{sec._count.students !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/sections/${sec.id}/edit`}
                        deleteAction={deleteSection.bind(null, sec.id)}
                        entityLabel="section"
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