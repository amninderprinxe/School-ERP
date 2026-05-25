import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { BookMarked, BookOpen, GraduationCap, Users, Megaphone } from "lucide-react";

export const metadata = { title: "Teacher — Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole(["TEACHER"]);

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      subjects: {
        include: {
          subject: { include: { class: true } },
        },
      },
      classTeacherOf: {
        include: { class: true },
      },
    },
  });

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId! },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const subjectCount   = teacherProfile?.subjects.length ?? 0;
  const sectionCount   = teacherProfile?.classTeacherOf.length ?? 0;
  const distinctClasses = new Set(
    teacherProfile?.subjects.map((s) => s.subject.classId) ?? []
  ).size;

  return (
    <div className="space-y-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {teacherProfile?.employeeCode
            ? `Employee Code: ${teacherProfile.employeeCode}`
            : "Teacher Dashboard"}
          {teacherProfile?.qualification && ` · ${teacherProfile.qualification}`}
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="My Subjects"
          value={subjectCount}
          description="Assigned to you"
          icon={BookMarked}
          color="blue"
        />
        <StatCard
          title="Classes Taught"
          value={distinctClasses}
          description="Distinct grade levels"
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Class Teacher Of"
          value={sectionCount === 0 ? "—" : sectionCount}
          description={sectionCount === 0 ? "Not assigned yet" : "Section(s)"}
          icon={GraduationCap}
          color="green"
        />
      </div>

      {/* ── My subjects list ─────────────────────────────────── */}
      {subjectCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">My Subjects</h2>
            <p className="text-xs text-gray-400 mt-0.5">Subjects assigned to you</p>
          </div>
          <div className="divide-y divide-gray-50">
            {teacherProfile!.subjects.map(({ subject }) => (
              <div
                key={subject.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <BookMarked className="w-4 h-4 text-blue-600" />
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
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0 ml-3">
                  {subject.class.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Class Teacher sections ───────────────────────────── */}
      {sectionCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Class Teacher — My Sections
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {teacherProfile!.classTeacherOf.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {section.class.name} — Section {section.name}
                  </p>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  Class Teacher
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Announcements ────────────────────────────────────── */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">School Announcements</h2>
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