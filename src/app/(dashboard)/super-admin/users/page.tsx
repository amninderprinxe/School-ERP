import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ResetPasswordButton } from "@/components/ui/reset-password-button";
import { Users } from "lucide-react";
import type { Role } from "@prisma/client";

export const metadata = { title: "All Users" };

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
];

const ROLE_STYLE: Record<Role, string> = {
  SUPER_ADMIN: "bg-red-50 text-red-700",
  SCHOOL_ADMIN: "bg-purple-50 text-purple-700",
  TEACHER: "bg-blue-50 text-blue-700",
  STUDENT: "bg-green-50 text-green-700",
  PARENT: "bg-orange-50 text-orange-700",
};

function formatRoleLabel(role: Role): string {
  return role
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  searchParams: Promise<{
    role?: string;
    schoolId?: string;
    page?: string;
    q?: string;
  }>;
}

export default async function SuperAdminUsersPage({ searchParams }: Props) {
  await requireRole(["SUPER_ADMIN"]);

  const sp = await searchParams;
  const roleFilter = ROLES.includes(sp.role as Role)
    ? (sp.role as Role)
    : undefined;
  const schoolFilter = sp.schoolId ?? undefined;
  const query = sp.q?.trim() ?? undefined;

  const page = Number(sp.page ?? 1) || 1;
  const PAGE_SIZE = 200;

  const where = {
    ...(roleFilter && { role: roleFilter }),
    ...(schoolFilter && { schoolId: schoolFilter }),
    ...(query && {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
      ],
    }),
  };

  const [totalCount, users, schools] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        school: { select: { name: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {users.length} user{users.length !== 1 ? "s" : ""} found
          {roleFilter && ` · Role: ${formatRoleLabel(roleFilter)}`}
          {schoolFilter && ` · Filtered by school`}
          {query && ` · Search: "${query}"`}
        </p>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
      >
        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search name or email…"
            className="flex-1 min-w-48 border border-gray-300 rounded-lg
              px-3 py-2 text-sm focus:outline-none focus:ring-2
              focus:ring-blue-500 focus:border-transparent"
          />

          {/* Role */}
          <select
            name="role"
            defaultValue={sp.role ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
              bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {formatRoleLabel(r)}
              </option>
            ))}
          </select>

          {/* School */}
          <select
            name="schoolId"
            defaultValue={sp.schoolId ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
              bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Submit */}
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white
              text-sm font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>

          {/* Clear */}

          <a href="/super-admin/users"
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600
              text-sm font-medium rounded-lg transition-colors
              inline-flex items-center"
          >
            Clear
          </a>
        </div>
      </form>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        {users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No users found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting the filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Head */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["User", "Role", "School", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-xs font-semibold
                          text-gray-500 uppercase tracking-wide
                          ${h === "Actions" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Name + email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700
                          text-xs font-bold rounded-full flex items-center
                          justify-center shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold
                          rounded-full ${ROLE_STYLE[u.role]}`}
                      >
                        {formatRoleLabel(u.role)}
                      </span>
                    </td>

                    {/* School */}
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {u.school?.name ?? (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Active status */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold
                          rounded-full ${u.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {u.role !== "SUPER_ADMIN" && (
                        <ResetPasswordButton
                          targetUserId={u.id}
                          userName={u.name}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={`?page=${page - 1}${roleFilter ? `&role=${roleFilter}` : ""
                        }${schoolFilter ? `&schoolId=${schoolFilter}` : ""
                        }${query ? `&q=${encodeURIComponent(query)}` : ""
                        }`}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      Previous
                    </a>
                  )}

                  {page < totalPages && (
                    <a href={`?page=${page + 1}${roleFilter ? `&role=${roleFilter}` : ""
                        }${schoolFilter ? `&schoolId=${schoolFilter}` : ""
                        }${query ? `&q=${encodeURIComponent(query)}` : ""
                        }`}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Next
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Limit notice */}
            {users.length >= 200 && (
              <p className="text-center text-xs text-gray-400 py-3
                border-t border-gray-50">
                Showing first 200 results — use filters to narrow down.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
