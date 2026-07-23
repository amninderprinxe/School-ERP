import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { Users }        from "lucide-react";

export const metadata = { title: "My Students" };

export default async function TeacherStudentsPage() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: {
      classTeacherOf: { where: { schoolId } },
      subjects: {
        include: {
          subject: {
            include: {
              class: {
                include: {
                  sections: { where: { schoolId } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Build set of section IDs this teacher can see
  const sectionIds = new Set<string>();
  for (const sec of teacherProfile?.classTeacherOf ?? []) {
    sectionIds.add(sec.id);
  }
  for (const ts of teacherProfile?.subjects ?? []) {
    for (const sec of ts.subject.class.sections) {
      sectionIds.add(sec.id);
    }
  }

  const students =
    sectionIds.size === 0
      ? []
      : await prisma.studentProfile.findMany({
          where: {
            sectionId: { in: Array.from(sectionIds) },
            user:      { schoolId, isActive: true },
          },
          include: {
            user:    { select: { name: true, email: true, gender: true } },
            section: { include: { class: true } },
          },
          orderBy: [
            { section: { class: { name: "asc" } } },
            { rollNumber: "asc" },
          ],
        });

  // Group by section
  const bySection = new Map<string, {
    label:    string;
    students: typeof students;
  }>();
  for (const s of students) {
    const key   = s.sectionId ?? "unassigned";
    const label = s.section
      ? `${s.section.class.name} — Section ${s.section.name}`
      : "Unassigned";
    if (!bySection.has(key)) bySection.set(key, { label, students: [] });
    bySection.get(key)!.students.push(s);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {students.length} student
          {students.length !== 1 ? "s" : ""} across your assigned sections
        </p>
      </div>

      {bySection.size === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No students yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Students will appear here once they are assigned to your sections.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(bySection.entries()).map(([key, group]) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100
                flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  {group.label}
                </p>
                <span className="text-xs text-gray-400">
                  {group.students.length} student
                  {group.students.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Students */}
              <div className="divide-y divide-gray-50">
                {group.students.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-3
                      hover:bg-gray-50/50 transition-colors"
                  >
                    <span className="w-6 text-xs text-gray-400 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 bg-green-100 text-green-700
                      text-xs font-bold rounded-full flex items-center
                      justify-center shrink-0">
                      {s.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.user.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {s.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.rollNumber && (
                        <span className="text-xs font-mono text-gray-500
                          bg-gray-100 px-2 py-0.5 rounded">
                          {s.rollNumber}
                        </span>
                      )}
                      {s.user.gender && (
                        <span className="text-xs text-gray-400 bg-gray-100
                          px-2 py-0.5 rounded hidden sm:inline">
                          {s.user.gender}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
