import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { BookMarked }   from "lucide-react";

export const metadata = { title: "My Subjects" };

export default async function TeacherSubjectsPage() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: {
      subjects: {
        include: {
          subject: {
            include: { class: true },
          },
        },
        orderBy: { subject: { class: { name: "asc" } } },
      },
    },
  });

  const subjects = teacherProfile?.subjects ?? [];

  // Verify all subjects belong to the teacher's school
  const safeSubjects = subjects.filter(
    (ts) => ts.subject.schoolId === schoolId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {safeSubjects.length} subject
          {safeSubjects.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {safeSubjects.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No subjects assigned yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your school admin to be assigned to subjects.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Subject", "Code", "Class"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-semibold text-gray-500
                        uppercase tracking-wide text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {safeSubjects.map(({ subject }, i) => (
                  <tr
                    key={subject.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex
                          items-center justify-center shrink-0">
                          <BookMarked className="w-3.5 h-3.5 text-orange-500" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {subject.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {subject.code ? (
                        <span className="font-mono text-xs text-gray-500
                          bg-gray-100 px-2 py-0.5 rounded">
                          {subject.code}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium
                        bg-blue-50 text-blue-700 rounded-full">
                        {subject.class.name}
                      </span>
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
