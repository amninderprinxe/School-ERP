import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Globe,
} from "lucide-react";

export const metadata = { title: "Super Admin Dashboard" };

function greet(name: string | null): string {
  const h = new Date().getHours();
  const t = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const fn = name ? name.split(" ")[0] : null;
  return `Good ${t}${fn ? `, ${fn}` : ""}`;
}

function relTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "recently";
  try {
    const diff = Date.now() - new Date(dateInput).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "recently";
  }
}

export default async function SuperAdminDashboard() {
  const user = await requireRole(["SUPER_ADMIN"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalSchools = 0;
  let activeSchools = 0;
  let suspendedCount = 0;
  let totalUsers = 0;
  let todayLogs = 0;
  let recentSchools: Array<{
    id: string;
    name: string;
    status: string;
    userCount: number;
    timeAgo: string;
  }> = [];
  let recentAudit: Array<{
    id: string;
    action: string;
    entity: string;
    entityName: string | null;
    userName: string;
    schoolName: string;
    timeAgo: string;
  }> = [];

  try {
    // 1. Fetch schools safely
    const allSchools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    totalSchools = allSchools.length;

    // Check school status safely
    const schoolsWithStatus = await (prisma.school as any).findMany({
      select: { id: true, status: true, isActive: true },
    }).catch(() => []);

    activeSchools = schoolsWithStatus.filter(
      (s: any) => s.status === "ACTIVE" || s.isActive === true || (!s.status && s.isActive !== false)
    ).length || totalSchools;

    suspendedCount = schoolsWithStatus.filter(
      (s: any) => s.status === "SUSPENDED" || s.isActive === false
    ).length;

    recentSchools = allSchools.slice(0, 6).map((s: any) => {
      const match = schoolsWithStatus.find((st: any) => st.id === s.id);
      return {
        id: s.id,
        name: s.name ?? "School",
        status: match?.status ?? (match?.isActive === false ? "SUSPENDED" : "ACTIVE"),
        userCount: s._count?.users ?? 0,
        timeAgo: relTime(s.createdAt),
      };
    });
  } catch (err) {
    console.error("[DASHBOARD_SCHOOLS_ERROR]", err);
  }

  try {
    // 2. Fetch Users safely
    totalUsers = await prisma.user.count({
      where: { role: { not: "SUPER_ADMIN" } },
    });
  } catch (err) {
    console.error("[DASHBOARD_USERS_ERROR]", err);
  }

  try {
    // 3. Fetch Audit logs safely
    todayLogs = await prisma.auditLog.count({
      where: { createdAt: { gte: today } },
    });

    const rawAudit = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
    });

    recentAudit = rawAudit.map((log: any) => ({
      id: log.id,
      action: String(log.action || "Action"),
      entity: String(log.entity || "System"),
      entityName: log.entityName ? String(log.entityName) : null,
      userName: log.userName ? String(log.userName) : "User",
      schoolName: log.schoolName ? String(log.schoolName) : "Platform",
      timeAgo: relTime(log.createdAt),
    }));
  } catch (err) {
    console.error("[DASHBOARD_AUDIT_ERROR]", err);
  }

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    SUSPENDED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greet(user?.name ?? "Super Admin")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Platform overview · Super Admin
          </p>
        </div>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/super-admin/schools"
          className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Schools
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{totalSchools}</p>
            <p className="mt-1 text-xs text-gray-500">
              {activeSchools} active · {suspendedCount} suspended
            </p>
          </div>
        </Link>

        <Link
          href="/super-admin/schools"
          className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Active Schools
            </span>
            <div className="rounded-lg bg-green-50 p-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{activeSchools}</p>
            <p className="mt-1 text-xs text-gray-500">
              {Math.round((activeSchools / Math.max(1, totalSchools)) * 100)}% of all schools
            </p>
          </div>
        </Link>

        <Link
          href="/super-admin/users"
          className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Users
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {totalUsers.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Students, teachers, parents, admins
            </p>
          </div>
        </Link>

        <Link
          href="/super-admin/audit-logs"
          className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Activity Today
            </span>
            <div
              className={`rounded-lg p-2 ${
                todayLogs > 50 ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{todayLogs}</p>
            <p className="mt-1 text-xs text-gray-500">
              Platform-wide actions logged
            </p>
          </div>
        </Link>
      </div>

      {/* ── Lists ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Schools */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
                No schools found
              </li>
            ) : (
              recentSchools.map((school) => (
                <li
                  key={school.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {school.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {school.userCount} user{school.userCount !== 1 ? "s" : ""} · {school.timeAgo}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                      STATUS_STYLE[school.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {school.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
            ) : (
              recentAudit.map((log) => (
                <li key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 leading-snug">
                      {log.userName}
                      <span className="font-normal text-gray-500">
                        {" "}
                        {log.action.toLowerCase().replace(/_/g, " ")}{" "}
                      </span>
                      {log.entityName && (
                        <span className="font-medium">{log.entityName}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {log.schoolName} · {log.timeAgo}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}