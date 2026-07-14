import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { BookMarked, GraduationCap, Hash, Users, Megaphone } from "lucide-react";

export const metadata = { title: "Student — Dashboard" };

export default async function StudentDashboard() {
  const user = await requireRole(["STUDENT"]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      section: {
        include: {
          class: true,
          classTeacher: {
            include: { user: true },
          },
        },
      },
    },
  });
  
  const subjects = studentProfile?.section?.classId
    ? await prisma.subject.findMany({
        where: { classId: studentProfile.section.classId },
        include: {
          teachers: {
            include: { teacherProfile: { include: { user: true } } },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId! },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const className  = studentProfile?.section?.class?.name;
  const sectionName = studentProfile?.section?.name;

  return (
    <div className="space-y-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {className && sectionName
            ? `${className} — Section ${sectionName}`
            : "Student Dashboard"}
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="My Class"
          value={className ?? "—"}
          description={sectionName ? `Section ${sectionName}` : "Not assigned"}
          icon={GraduationCap}
          color="blue"
        />
        <StatCard
          title="My Subjects"
          value={subjects.length}
          description="This academic year"
          icon={BookMarked}
          color="purple"
        />
        <StatCard
          title="Roll Number"
          value={studentProfile?.rollNumber ?? "—"}
          description={
            studentProfile?.admissionNo
              ? `Adm: ${studentProfile.admissionNo}`
              : "Not assigned"
          }
          icon={Hash}
          color="green"
        />
      </div>

      {/* ── Class teacher card ───────────────────────────────── */}
      {studentProfile?.section?.classTeacher && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            My Class Teacher
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
              {studentProfile.section.classTeacher.user.name?.[0] ?? "T"}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {studentProfile.section.classTeacher.user.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {studentProfile.section.classTeacher.qualification ?? "Class Teacher"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {studentProfile.section.classTeacher.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Subjects list ────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">My Subjects</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {className} curriculum
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {subjects.map((subject) => {
              const teacher = subject.teachers[0]?.teacherProfile?.user;
              return (
                <div
                  key={subject.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                      <BookMarked className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {subject.name}
                      </p>
                      {subject.code && (
                        <p className="text-xs text-gray-400">{subject.code}</p>
                      )}
                    </div>
                  </div>
                  {teacher && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 ml-3">
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:block truncate max-w-[120px]">
                        {teacher.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Announcements ────────────────────────────────────── */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              School Announcements
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {announcements.map((ann) => (
              <div key={ann.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ann.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
