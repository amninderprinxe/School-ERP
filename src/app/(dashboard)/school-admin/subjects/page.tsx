import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { BookMarked, Plus, UserCheck } from "lucide-react";
import { RowActions } from "@/components/ui/row-actions";
import { deleteSubject } from "@/action/subject.actions";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    include: {
      class: {
        select: { id: true, name: true },
      },
      teachers: {
        include: {
          section: {
            select: { id: true, name: true },
          },
          teacherProfile: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} configured
          </p>
        </div>

        <Link
          href="/school-admin/subjects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </Link>
      </div>

      {/* ── Table Card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {subjects.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No subjects added yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add your first subject to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {["Subject", "Code", "Class", "Section Allocations & Teachers", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
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
                  const allocations = subject.teachers || [];

                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Subject Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                            <BookMarked className="w-4.5 h-4.5 text-purple-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {subject.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-5 py-4">
                        {subject.code ? (
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {subject.code}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Class */}
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                          {subject.class?.name ?? "—"}
                        </span>
                      </td>

                      {/* Section Allocations & Teachers */}
                      <td className="px-5 py-4">
                        {allocations.length === 0 ? (
                          <span className="text-xs text-gray-400">
                            No sections allocated
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {allocations.map((alloc) => {
                              const sectionName = alloc.section?.name ?? "—";
                              const teacherName =
                                alloc.teacherProfile?.user?.name ?? "No Teacher";

                              return (
                                <span
                                  key={alloc.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-700"
                                >
                                  <span className="font-semibold text-gray-900 bg-gray-200/80 px-1.5 py-0.2 rounded text-[11px]">
                                    Sec {sectionName}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-gray-600">
                                    <UserCheck className="w-3 h-3 text-emerald-600" />
                                    {teacherName}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
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