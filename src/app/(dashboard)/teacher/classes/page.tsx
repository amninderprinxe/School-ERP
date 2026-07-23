import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { BookOpen, Users } from "lucide-react";

export const metadata = { title: "My Classes" };

export default async function TeacherClassesPage() {
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: {
      classTeacherOf: {
        where:   { schoolId },
        include: {
          class:    true,
          _count:   { select: { students: true } },
        },
      },
      subjects: {
        include: {
          subject: {
            include: {
              class: {
                include: {
                  sections: {
                    where:   { schoolId },
                    include: { _count: { select: { students: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">Teacher profile not found.</p>
      </div>
    );
  }

  // Build de-duplicated class list
  const classMap = new Map<string, {
    id: string; name: string; sections: {
      id: string; name: string; isMySection: boolean; studentCount: number;
    }[];
  }>();

  // From class-teacher assignments
  for (const sec of teacherProfile.classTeacherOf) {
    if (!classMap.has(sec.class.id)) {
      classMap.set(sec.class.id, { id: sec.class.id, name: sec.class.name, sections: [] });
    }
    classMap.get(sec.class.id)!.sections.push({
      id: sec.id, name: sec.name, isMySection: true,
      studentCount: sec._count.students,
    });
  }

  // From taught subjects
  for (const ts of teacherProfile.subjects) {
    const cls = ts.subject.class;
    if (!classMap.has(cls.id)) {
      classMap.set(cls.id, { id: cls.id, name: cls.name, sections: [] });
    }
    const entry = classMap.get(cls.id)!;
    for (const sec of cls.sections) {
      if (!entry.sections.find((s) => s.id === sec.id)) {
        entry.sections.push({
          id: sec.id, name: sec.name, isMySection: false,
          studentCount: sec._count.students,
        });
      }
    }
  }

  const classes = Array.from(classMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Classes and sections you are associated with
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No classes assigned yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to be assigned as a class teacher or
            subject teacher.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Class header */}
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-100
                flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center
                  justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-900 text-base">{cls.name}</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {cls.sections.length} section
                    {cls.sections.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div className="divide-y divide-gray-50">
                {cls.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex
                        items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Section {sec.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sec.studentCount} student
                          {sec.studentCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {sec.isMySection && (
                      <span className="px-2.5 py-1 text-xs font-semibold
                        bg-green-50 text-green-700 border border-green-200
                        rounded-full">
                        Class Teacher
                      </span>
                    )}
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
