"use client";

import { useState, useMemo } from "react";
import { GraduationCap, Search, Download } from "lucide-react";
import { RowActions } from "@/components/ui/row-actions";
import { deleteStudent } from "@/action/student.actions";

export interface StudentItem {
  id: string;
  name: string;
  email: string | null;
  gender: string | null;
  rollNumber: string | number | null;
  admissionNo: string | null;
  className: string;
  sectionName: string;
}

interface Props {
  students: StudentItem[];
  classes: string[];
}

export function StudentTableClient({ students, classes }: Props) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toString().toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q));

      const matchesClass =
        classFilter === "ALL" || s.className === classFilter;

      const matchesGender =
        genderFilter === "ALL" || s.gender === genderFilter;

      return matchesQuery && matchesClass && matchesGender;
    });
  }, [students, query, classFilter, genderFilter]);

  const handleDownloadCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["Admission No", "Roll No", "Name", "Gender", "Class", "Section", "Email"];
    const rows = filtered.map((s) => [
      `"${s.admissionNo ?? ""}"`,
      `"${s.rollNumber ?? ""}"`,
      `"${s.name}"`,
      `"${s.gender ?? ""}"`,
      `"${s.className}"`,
      `"${s.sectionName}"`,
      `"${s.email ?? ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Students_${classFilter !== "ALL" ? classFilter : "All"}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, roll no, adm no..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium"
          >
            <option value="ALL">All Classes</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium"
          >
            <option value="ALL">All Genders</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4 text-gray-500" />
          Download List ({filtered.length})
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No students match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Email", "Gender", "Roll No.", "Adm. No.", "Section", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                        h === "" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {s.name[0]?.toUpperCase() ?? "S"}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{s.email || "—"}</td>
                    <td className="px-5 py-4">
                      {s.gender ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {s.gender}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">
                      {s.rollNumber ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">
                      {s.admissionNo ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {s.className && s.sectionName ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {s.className} — {s.sectionName}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">Not assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/students/${s.id}/edit`}
                        deleteAction={deleteStudent.bind(null, s.id)}
                        entityLabel="student"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}