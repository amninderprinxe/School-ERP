import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RowActions } from "@/components/ui/row-actions";
import { deleteTeacher } from "@/action/teacher.actions";
import { UserCheck, Plus } from "lucide-react";

export const metadata = { title: "Teachers" };

export default async function TeachersPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const teachers = await prisma.user.findMany({
    where: { schoolId, role: "TEACHER" },
    include: { teacherProfile: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {teachers.length} teacher{teachers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/school-admin/teachers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Teacher
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {teachers.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No teachers yet</p>
            <p className="text-xs text-gray-400 mt-1">Click &ldquo;Add Teacher&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Email", "Gender", "Emp. Code", "Qualification", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {t.name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{t.email}</td>
                    <td className="px-5 py-4">
                      {t.gender
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{t.gender}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{t.teacherProfile?.employeeCode  ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{t.teacherProfile?.qualification ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/teachers/${t.id}/edit`}
                        deleteAction={deleteTeacher.bind(null, t.id)}
                        entityLabel="teacher"
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