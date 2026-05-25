import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { Baby, GraduationCap, Megaphone, Hash } from "lucide-react";

export const metadata = { title: "Parent — Dashboard" };

export default async function ParentDashboard() {
  const user = await requireRole(["PARENT"]);

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user: true,
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId! },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const childrenCount = parentProfile?.children.length ?? 0;

  return (
    <div className="space-y-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {parentProfile?.occupation
            ? `Occupation: ${parentProfile.occupation}`
            : "Parent Dashboard"}
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="My Children"
          value={childrenCount}
          description={childrenCount === 1 ? "Child enrolled" : "Children enrolled"}
          icon={Baby}
          color="blue"
        />
        <StatCard
          title="Announcements"
          value={announcements.length}
          description="From school"
          icon={Megaphone}
          color="indigo"
        />
        <StatCard
          title="Academic Year"
          value="2024–25"
          description="Current session"
          icon={GraduationCap}
          color="green"
        />
      </div>

      {/* ── Children cards ───────────────────────────────────── */}
      {childrenCount > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            My Children
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parentProfile!.children.map(({ studentProfile, relation }) => {
              const className   = studentProfile.section?.class?.name;
              const sectionName = studentProfile.section?.name;

              return (
                <div
                  key={studentProfile.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  {/* Child header */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow">
                      {studentProfile.user.name?.[0] ?? "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {studentProfile.user.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {className && sectionName
                          ? `${className} — Section ${sectionName}`
                          : "Class not assigned"}
                      </p>
                      {relation && (
                        <span className="inline-flex items-center px-2 py-0.5 mt-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {relation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Child details */}
                  <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Roll No.
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {studentProfile.rollNumber ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Adm. No.
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {studentProfile.admissionNo ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Announcements ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            School Announcements
          </h2>
          <Megaphone className="w-5 h-5 text-gray-300" />
        </div>

        <div className="divide-y divide-gray-50">
          {announcements.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No announcements yet.
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
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