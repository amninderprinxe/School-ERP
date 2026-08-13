import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import Link             from "next/link";
import { StatCard }     from "@/components/dashboard/stat-card";
import {
  Building2,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Globe,
}                       from "lucide-react";

export const metadata = { title: "Super Admin Dashboard" };

function greet(name: string | null): string {
  const h = new Date().getHours();
  const t = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const fn = name?.split(" ")[0] ?? null;
  return `Good ${t}${fn ? `, ${fn}` : ""}`;
}

function relTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const m    = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function SuperAdminDashboard() {
  const user = await requireRole(["SUPER_ADMIN"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    schoolsByStatus,
    totalUsers,
    todayLogs,
    recentSchools,
    recentAudit,
  ] = await Promise.all([
    // School counts grouped by status
    prisma.school.groupBy({
      by:      ["status"],
      _count:  { _all: true },
    }),
    // Non super-admin users
    prisma.user.count({
      where: { role: { not: "SUPER_ADMIN" } },
    }),
    // Today's platform activity
    prisma.auditLog.count({
      where: { createdAt: { gte: today } },
    }),
    // Recent schools with user count
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      take:    6,
      select: {
        id:        true,
        name:      true,
        status:    true,
        createdAt: true,
        _count:    { select: { users: true } },
      },
    }),
    // Last 7 global audit entries
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take:    7,
      select: {
        id:         true,
        action:     true,
        entity:     true,
        entityName: true,
        userName:   true,
        userRole:   true,
        schoolName: true,
        createdAt:  true,
      },
    }),
  ]);

  const totalSchools  = schoolsByStatus.reduce((s, g) => s + g._count._all, 0);
  const activeSchools = schoolsByStatus.find((g) => g.status === "ACTIVE")?._count._all ?? 0;
  const suspendedCount = schoolsByStatus.find((g) => g.status === "SUSPENDED")?._count._all ?? 0;

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:    "bg-green-100 text-green-700",
    INACTIVE:  "bg-gray-100  text-gray-600",
    SUSPENDED: "bg-red-100   text-red-700",
  };

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greet(user.name?? "User")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Platform overview · Super Admin
          </p>
        </div>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric",
            month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Schools"
          value={totalSchools}
          description={`${activeSchools} active · ${suspendedCount} suspended`}
          icon={Building2}
          href="/super-admin/schools"
          color="blue"
        />
        <StatCard
          title="Active Schools"
          value={activeSchools}
          description={`${Math.round((activeSchools / Math.max(1, totalSchools)) * 100)}% of all schools`}
          icon={CheckCircle2}
          href="/super-admin/schools"
          color="green"
        />
        <StatCard
          title="Total Users"
          value={totalUsers.toLocaleString("en-IN")}
          description="Students, teachers, parents, admins"
          icon={Users}
          href="/super-admin/users"
          color="indigo"
        />
        <StatCard
          title="Activity Today"
          value={todayLogs}
          description="Platform-wide actions logged"
          icon={Activity}
          href="/super-admin/audit-logs"
          color={todayLogs > 50 ? "amber" : "gray"}
        />
      </div>

      {/* ── Two column ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent schools */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Recent Schools</p>
            <Link
              href="/super-admin/schools"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentSchools.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-gray-400">
                No schools yet
              </li>
            ) : recentSchools.map((school) => (
              <li key={school.id} className="flex items-center gap-4 px-5 py-3.5
                hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center
                  justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {school.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {school._count.users} user{school._count.users !== 1 ? "s" : ""}
                    · {relTime(school.createdAt)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold
                  rounded-full shrink-0 ${STATUS_STYLE[school.status] ?? ""}`}>
                  {school.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Recent Activity</p>
            <Link
              href="/super-admin/audit-logs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Full log →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentAudit.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-gray-400">
                No activity yet
              </li>
            ) : recentAudit.map((log) => (
              <li key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center
                  justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 leading-snug">
                    {log.userName}
                    <span className="font-normal text-gray-500">
                      {" "}{log.action.toLowerCase().replace(/_/g, " ")}{" "}
                    </span>
                    {log.entityName && (
                      <span className="font-medium">{log.entityName}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {log.schoolName ?? "Platform"} · {relTime(log.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}