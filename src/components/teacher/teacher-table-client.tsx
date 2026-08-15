"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Download, Pencil, Search, Trash2, UserRound, Users } from "lucide-react";

export interface TeacherItem {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  gender: string | null;
  employeeCode: string | null;
  qualification: string | null;
  isActive: boolean;
}

interface Props {
  teachers: TeacherItem[];
  deleteAction: (formData: FormData) => Promise<void>;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatGender(gender: string | null) {
  if (!gender) {
    return "Not specified";
  }

  return gender
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function TeacherTableClient({ teachers, deleteAction }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [qualFilter, setQualFilter] = useState("ALL");

  // Extract unique qualifications for dropdown
  const qualifications = useMemo(() => {
    return Array.from(
      new Set(
        teachers
          .map((t) => t.qualification?.trim())
          .filter(Boolean) as string[]
      )
    );
  }, [teachers]);

  // Real-time filtering
  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.employeeCode && t.employeeCode.toLowerCase().includes(q)) ||
        (t.qualification && t.qualification.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && t.isActive) ||
        (statusFilter === "INACTIVE" && !t.isActive);

      const matchesQual =
        qualFilter === "ALL" ||
        (t.qualification && t.qualification.trim() === qualFilter);

      return matchesQuery && matchesStatus && matchesQual;
    });
  }, [teachers, query, statusFilter, qualFilter]);

  // Download filtered data as CSV
  const handleDownloadCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["Employee Code", "Name", "Email", "Gender", "Qualification", "Status"];
    const rows = filtered.map((t) => [
      `"${t.employeeCode ?? ""}"`,
      `"${t.name}"`,
      `"${t.email ?? ""}"`,
      `"${formatGender(t.gender)}"`,
      `"${t.qualification ?? ""}"`,
      `"${t.isActive ? "Active" : "Inactive"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Teachers_List_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, code, qualification..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Qualification Filter */}
          {qualifications.length > 0 && (
            <select
              value={qualFilter}
              onChange={(e) => setQualFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Qualifications</option>
              {qualifications.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Download CSV Button */}
        <button
          type="button"
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Download className="h-4 w-4 text-gray-500" />
          Download List ({filtered.length})
        </button>
      </div>

      {/* ── Teachers Table ───────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Gender
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Emp. Code
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Qualification
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.map((teacher) => {
                  const teacherName = teacher.name.trim() || "Teacher";
                  const initials = getInitials(teacherName);

                  return (
                    <tr
                      key={teacher.id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-600">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {teacherName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">
                          {teacher.email || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {formatGender(teacher.gender)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-sm text-gray-600">
                          {teacher.employeeCode || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">
                          {teacher.qualification?.trim() || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            teacher.isActive
                              ? "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                              : "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                          }
                        >
                          {teacher.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/school-admin/teachers/${teacher.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>

                          <form action={deleteAction}>
                            <input
                              type="hidden"
                              name="teacherProfileId"
                              value={teacher.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-900">
            No teachers found
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            No teacher matches your search and filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}