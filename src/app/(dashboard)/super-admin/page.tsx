import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Building2, Users, GraduationCap, UserCheck,
  Activity, TrendingUp,
} from "lucide-react";

export const metadata = { title: "Super Admin — Dashboard" };

export default async function SuperAdminDashboard() {
  const user = await requireRole(["SUPER_ADMIN"]);

  const [
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "SCHOOL_ADMIN" } }),
  ]);

  const recentSchools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { _count: { select: { users: true } } },
  });

  const statusStyles: Record<string, string> = {
    ACTIVE:    "bg-green-50 text-green-700",
    INACTIVE:  "bg-gray-100 text-gray-600",
    SUSPENDED: "bg-red-50 text-red-600",
  };

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Global overview of the School ERP platform.
        </p>
      </div>

      {/* ── Stats grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Schools"
          value={totalSchools}
          description={`${activeSchools} active`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          description="Across all schools"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Students"
          value={totalStudents}
          description="Platform-wide"
          icon={GraduationCap}
          color="green"
        />
        <StatCard
          title="Teachers"
          value={totalTeachers}
          description="Active educators"
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="School Admins"
          value={totalAdmins}
          description="Admin accounts"
          icon={Activity}
          color="orange"
        />
        <StatCard
          title="Active Schools"
          value={activeSchools}
          description={`${totalSchools - activeSchools} inactive / suspended`}
          icon={TrendingUp}
          color="teal"
        />
      </div>

      {/* ── Recent schools ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All Schools</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Recently registered schools on the platform
            </p>
          </div>
          <Building2 className="w-5 h-5 text-gray-300" />
        </div>

        {recentSchools.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No schools found. Add your first school.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentSchools.map((school) => (
              <div
                key={school.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {school.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {school.email ?? school.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {school._count.users} users
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusStyles[school.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {school.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
