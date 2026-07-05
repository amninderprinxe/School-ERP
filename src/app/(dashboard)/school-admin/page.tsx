import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  GraduationCap, UserCheck, BookOpen,
  BookMarked, Megaphone, Layers,
} from "lucide-react";

export const metadata = { title: "School Admin — Dashboard" };

export default async function SchoolAdminDashboard() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const [
    studentCount,
    teacherCount,
    classCount,
    sectionCount,
    subjectCount,
    school,
    announcements,
  ] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: "STUDENT" } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER" } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {school?.name ?? "Your School"} — School Management Overview
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Students"
          value={studentCount}
          description="Enrolled students"
          icon={GraduationCap}
          color="green"
        />
        <StatCard
          title="Total Teachers"
          value={teacherCount}
          description="Teaching staff"
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="Classes"
          value={classCount}
          description={`${sectionCount} sections total`}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Subjects"
          value={subjectCount}
          description="Across all classes"
          icon={BookMarked}
          color="orange"
        />
        <StatCard
          title="Sections"
          value={sectionCount}
          description={`Avg ${classCount ? Math.round(sectionCount / classCount) : 0} per class`}
          icon={Layers}
          color="indigo"
        />
        <StatCard
          title="Announcements"
          value={announcements.length}
          description="Published so far"
          icon={Megaphone}
          color="teal"
        />
      </div>

      {/* ── Quick info banner ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "School Name",  value: school?.name ?? "—" },
          { label: "Contact",      value: school?.phone ?? "—" },
          { label: "Email",        value: school?.email ?? "—" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Announcements ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Recent Announcements
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Latest school-wide announcements
            </p>
          </div>
          <Megaphone className="w-5 h-5 text-gray-300" />
        </div>

        <div className="divide-y divide-gray-50">
          {announcements.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No announcements yet. Create the first one.
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {ann.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {ann.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
