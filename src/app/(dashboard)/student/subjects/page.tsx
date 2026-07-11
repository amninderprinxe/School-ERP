import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { BookMarked }   from "lucide-react";

export const metadata = { title: "My Subjects" };

export default async function StudentSubjectsPage() {
  const user = await requireRole(["STUDENT"]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      section: { include: { class: true } },
    },
  });

  const subjects = studentProfile?.section?.classId
    ? await prisma.subject.findMany({
        where:   { classId: studentProfile.section.classId },
        include: {
          teachers: {
            include: {
              teacherProfile: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const classLabel = studentProfile?.section
    ? `${studentProfile.section.class.name} — Section ${studentProfile.section.name}`
    : "No section assigned";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="text-sm text-gray-500 mt-0.5">{classLabel}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!studentProfile?.section ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              Not assigned to a section
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your school admin to be assigned to a class and section.
            </p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No subjects added yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Your school admin has not added subjects to your class yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Subject", "Code", "Teacher(s)"].map((h) => (
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
                {subjects.map((sub, i) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex
                          items-center justify-center shrink-0">
                          <BookMarked className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {sub.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {sub.code ? (
                        <span className="font-mono text-xs text-gray-500
                          bg-gray-100 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {sub.teachers.length === 0 ? (
                        <span className="text-xs text-gray-300">
                          Not assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {sub.teachers.map(({ teacherProfile }) => (
                            <span
                              key={teacherProfile.id}
                              className="px-2 py-0.5 text-xs font-medium
                                bg-blue-50 text-blue-700 rounded-full"
                            >
                              {teacherProfile.user.name}
                            </span>
                          ))}
                        </div>
                      )}
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