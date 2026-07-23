import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RowActions } from "@/components/ui/row-actions";
import { deleteStudent } from "@/action/student.actions";
import { GraduationCap, Plus } from "lucide-react";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const students = await prisma.user.findMany({
    where: { schoolId, role: "STUDENT" },
    include: {
      studentProfile: {
        include: { section: { include: { class: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled
          </p>
        </div>
        <Link
          href="/school-admin/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
            text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No students yet</p>
            <p className="text-xs text-gray-400 mt-1">Click &ldquo;Add Student&rdquo; to enroll the first student.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Email", "Gender", "Roll No.", "Adm. No.", "Section", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => {
                  const prof    = s.studentProfile;
                  const section = prof?.section;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {s.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{s.email}</td>
                      <td className="px-5 py-4">
                        {s.gender
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{s.gender}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{prof?.rollNumber  ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{prof?.admissionNo ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-4">
                        {section
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{section.class.name} — {section.name}</span>
                          : <span className="text-xs text-gray-300">Not assigned</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <RowActions
                          editHref={`/school-admin/students/${s.id}/edit`}
                          deleteAction={deleteStudent.bind(null, s.id)}
                          entityLabel="student"
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
