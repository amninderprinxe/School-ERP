import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { BookMarked, Plus, Users } from "lucide-react";
import { RowActions } from "@/components/ui/row-actions";
import { deleteSubject } from "@/action/subject.actions";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    include: {
      class: true,
      teachers: {
        include: {
          teacherProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/school-admin/subjects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {subjects.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No subjects yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add your first subject to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Subject", "Code", "Class", "Teacher", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                        h === "" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {subjects.map((subject) => {
                  const teacher =
                    subject.teachers[0]?.teacherProfile?.user?.name ?? null;

                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                            <BookMarked className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="font-semibold text-gray-900">
                            {subject.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {subject.code ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          {subject.class?.name ?? "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {teacher ? (
                          <span className="inline-flex items-center gap-1.5 text-gray-600">
                            <Users className="w-3.5 h-3.5" />
                            {teacher}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <RowActions
                          editHref={`/school-admin/subjects/${subject.id}/edit`}
                          deleteAction={deleteSubject.bind(null, subject.id)}
                          entityLabel="subject"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
