import { requireRole }       from "@/lib/session";
import { prisma }            from "@/lib/db";
import Link                  from "next/link";
import { SchoolRowActions }  from "@/components/super-admin/school-row-actions";
import { Building2, Plus }   from "lucide-react";
import type { SchoolStatus } from "@prisma/client";

export const metadata = { title: "All Schools" };

// ── Status badge config ─────────────────────────────────────────
const STATUS_STYLE: Record<SchoolStatus, string> = {
  ACTIVE:    "bg-green-50  text-green-700",
  INACTIVE:  "bg-gray-100  text-gray-500",
  SUSPENDED: "bg-red-50    text-red-600",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

export default async function SuperAdminSchoolsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {schools.length} school{schools.length !== 1 ? "s" : ""} on the
            platform
          </p>
        </div>
        <Link
          href="/super-admin/schools/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
            transition-colors focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Add School
        </Link>
      </div>

      {/* ── Table card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {schools.length === 0 ? (
          /* Empty state */
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No schools registered yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create the first school to get started.
            </p>
            <Link
              href="/super-admin/schools/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
                text-xs font-semibold text-blue-600 bg-blue-50
                hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add first school
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Head */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "School",
                    "Slug",
                    "Status",
                    "Users",
                    "Created",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide
                        ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-50">
                {schools.map((school) => (
                  <tr
                    key={school.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Name + email */}
                    <td className="px-5 py-4 min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl
                          flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {school.name}
                          </p>
                          {school.email && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {school.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-500
                        bg-gray-100 px-2 py-0.5 rounded">
                        {school.slug}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1
                          rounded-full text-xs font-semibold
                          ${STATUS_STYLE[school.status]}`}
                      >
                        {school.status}
                      </span>
                    </td>

                    {/* User count */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium
                        bg-indigo-50 text-indigo-700 rounded-full">
                        {school._count.users} user
                        {school._count.users !== 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDate(school.createdAt)}
                      </span>
                    </td>

                    {/* Row actions */}
                    <td className="px-5 py-4 text-right min-w-[220px]">
                      <SchoolRowActions
                        schoolId={school.id}
                        status={school.status}
                        name={school.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      {schools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                label: "Active Schools",
                count: schools.filter((s) => s.status === "ACTIVE").length,
                style: "bg-green-50 text-green-700 border-green-100",
              },
              {
                label: "Inactive Schools",
                count: schools.filter((s) => s.status === "INACTIVE").length,
                style: "bg-gray-50 text-gray-600 border-gray-100",
              },
              {
                label: "Suspended Schools",
                count: schools.filter((s) => s.status === "SUSPENDED").length,
                style: "bg-red-50 text-red-600 border-red-100",
              },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-5 py-4 ${item.style}`}
            >
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-sm font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}