"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Download, Pencil, Search, Trash2, Users, Loader2 } from "lucide-react";
import { deleteTeacher } from "@/action/teacher.actions";

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
  if (!gender) return "Not specified";
  return gender
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TeacherTableClient({ teachers }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [qualFilter, setQualFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const qualifications = useMemo(() => {
    return Array.from(
      new Set(
        teachers
          .map((t) => t.qualification?.trim())
          .filter(Boolean) as string[]
      )
    );
  }, [teachers]);

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

  const handleDelete = (userId: string) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;
    setDeletingId(userId);
    startTransition(async () => {
      try {
        await deleteTeacher(userId);
      } catch (err) {
        console.error(err);
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

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

        <button
          type="button"
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Download className="h-4 w-4 text-gray-500" />
          Download List ({filtered.length})
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Gender</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Emp. Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Qualification</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.map((teacher) => {
                  const teacherName = teacher.name.trim() || "Teacher";
                  const initials = getInitials(teacherName);
                  const isDeleting = deletingId === teacher.userId;

                  return (
                    <tr key={teacher.id} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-600">
                            {initials}
                          </div>
                          <p className="truncate text-sm font-semibold text-gray-900">{teacherName}</p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">{teacher.email || "—"}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {formatGender(teacher.gender)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-sm text-gray-600">{teacher.employeeCode || "—"}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">{teacher.qualification?.trim() || "—"}</p>
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
                            href={`/school-admin/teachers/${teacher.userId}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>

                          <button
                            type="button"
                            disabled={isDeleting || isPending}
                            onClick={() => handleDelete(teacher.userId)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
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
          <Users className="h-6 w-6 text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">No teachers match your filter criteria.</p>
        </div>
      )}
    </div>
  );
}