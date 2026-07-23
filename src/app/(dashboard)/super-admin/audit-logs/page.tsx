import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import {
  ACTION_LABELS,
  ALL_ENTITIES,
  actionBadge,
  roleBadgeStyle,
  getDateFilter,
}                         from "@/lib/audit";
import { ShieldCheck, ChevronDown, Search, Globe } from "lucide-react";

export const metadata = { title: "Global Audit Log" };

const PAGE_SIZE = 50;

const DATE_RANGES = [
  { value: "",      label: "All Time"    },
  { value: "today", label: "Today"       },
  { value: "week",  label: "Last 7 Days" },
  { value: "month", label: "This Month"  },
];

interface Props {
  searchParams: Promise<{
    schoolId?: string;
    entity?:   string;
    action?:   string;
    q?:        string;
    range?:    string;
    page?:     string;
  }>;
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function relativeTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function SuperAdminAuditLogPage({ searchParams }: Props) {
  await requireRole(["SUPER_ADMIN"]);

  const sp           = await searchParams;
  const schoolFilter = sp.schoolId ?? "";
  const entity       = sp.entity   ?? "";
  const action       = sp.action   ?? "";
  const query        = sp.q?.trim() ?? "";
  const range        = sp.range    ?? "";
  const page         = Math.max(1, parseInt(sp.page ?? "1"));
  const skip         = (page - 1) * PAGE_SIZE;

  const dateFilter = getDateFilter(range);

  const where = {
    ...(schoolFilter && { schoolId: schoolFilter }),
    ...(entity       && { entity }),
    ...(action       && { action }),
    ...(query        && {
      OR: [
        { userName:   { contains: query, mode: "insensitive" as const } },
        { entityName: { contains: query, mode: "insensitive" as const } },
        { schoolName: { contains: query, mode: "insensitive" as const } },
      ],
    }),
    ...(dateFilter   && { createdAt: dateFilter }),
  };

  const [logs, totalCount, schools, uniqueActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.school.findMany({
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select:   { action: true },
      orderBy:  { action: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Summary counts
  const todayCount = await prisma.auditLog.count({
    where: { createdAt: { gte: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })() } },
  });

  function buildUrl(overrides: Record<string, string | number>): string {
    const params = new URLSearchParams({
      ...(schoolFilter && { schoolId: schoolFilter }),
      ...(entity       && { entity }),
      ...(action       && { action }),
      ...(query        && { q: query }),
      ...(range        && { range }),
      page: String(page),
      ...overrides,
    });
    for (const [k, v] of Array.from(params.entries())) {
      if (!v || v === "1") params.delete(k);
    }
    const str = params.toString();
    return str ? `?${str}` : "?";
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Platform-wide activity across all schools
        </p>
      </div>

      {/* ── Summary stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Records",   value: totalCount.toLocaleString(), icon: ShieldCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
          { label: "Activity Today",  value: todayCount.toLocaleString(), icon: Globe,        color: "text-blue-700",   bg: "bg-blue-50"   },
          { label: "Schools Tracked", value: schools.length,              icon: Globe,        color: "text-purple-700", bg: "bg-purple-50" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm
              p-4 flex items-start gap-3"
          >
            <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center
              justify-center shrink-0 mt-0.5`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
      >
        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search user, entity, or school…"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3
                py-2.5 text-sm focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* School filter */}
          <div className="relative">
            <select
              name="schoolId"
              defaultValue={schoolFilter}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Schools</option>
              <option value="__platform__">Platform (no school)</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Entity */}
          <div className="relative">
            <select
              name="entity"
              defaultValue={entity}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              {ALL_ENTITIES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Action */}
          <div className="relative">
            <select
              name="action"
              defaultValue={action}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {ACTION_LABELS[a.action] ?? a.action}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <div className="relative">
            <select
              name="range"
              defaultValue={range}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
              text-sm font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
          
          <a  href="/super-admin/audit-logs"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600
              text-sm font-medium rounded-lg transition-colors inline-flex
              items-center"
          >
            Clear
          </a>
        </div>
      </form>

      {/* ── Log table ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center
          justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Activity Records
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalCount} record{totalCount !== 1 ? "s" : ""} found
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-gray-300" />
        </div>

        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No audit records found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Records appear automatically as users take actions.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Time", "User", "School",
                      "Action", "Entity", "Name / ID", "Details",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-xs font-semibold
                          text-gray-500 uppercase tracking-wide text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900">
                          {relativeTime(log.createdAt)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatTime(log.createdAt)}
                        </p>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900
                          truncate max-w-[120px]">
                          {log.userName}
                        </p>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px]
                            font-bold rounded mt-0.5
                            ${roleBadgeStyle(log.userRole)}`}
                        >
                          {log.userRole.replace("_", " ")}
                        </span>
                      </td>

                      {/* School */}
                      <td className="px-4 py-3.5">
                        {log.schoolName ? (
                          <span className="text-xs font-medium text-gray-700
                            truncate max-w-[120px] block">
                            {log.schoolName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1
                            text-xs font-semibold text-indigo-600">
                            <Globe className="w-3 h-3" />
                            Platform
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs
                            font-semibold rounded-full whitespace-nowrap
                            ${actionBadge(log.action)}`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>

                      {/* Entity type */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-medium
                          bg-gray-100 text-gray-600 rounded">
                          {log.entity}
                        </span>
                      </td>

                      {/* Entity name */}
                      <td className="px-4 py-3.5 max-w-[130px]">
                        {log.entityName ? (
                          <p className="text-sm font-medium text-gray-900
                            truncate">
                            {log.entityName}
                          </p>
                        ) : log.entityId ? (
                          <p className="text-xs font-mono text-gray-400 truncate">
                            {log.entityId.slice(0, 10)}…
                          </p>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Metadata */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        {log.metadata ? (
                          <p
                            className="text-xs text-gray-500 font-mono truncate"
                            title={JSON.stringify(log.metadata)}
                          >
                            {JSON.stringify(log.metadata)
                              .replace(/[{}"]/g, "")
                              .slice(0, 50)}
                          </p>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex
                items-center justify-between gap-4">
                <p className="text-xs text-gray-400">
                  Page {page} of {totalPages} · {totalCount} total
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    
                    <a  href={buildUrl({ page: page - 1 })}
                      className="px-4 py-2 text-sm font-medium text-gray-600
                        bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      ← Prev
                    </a>
                  )}
                  {page < totalPages && (
                    
                    <a  href={buildUrl({ page: page + 1 })}
                      className="px-4 py-2 text-sm font-medium text-white
                        bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Next →
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}