import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import { notFound }       from "next/navigation";
import Link               from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  calcPercentage,
  gradeStyle,
  pctTextStyle,
}                         from "@/lib/results-utils";
import { EXAM_TYPE_LABELS } from "@/lib/validations/exam";
import type { ExamType }    from "@prisma/client";

export const metadata = { title: "Exam Results" };

interface Props {
  params:      Promise<{ id: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function ExamResultsPage({ params, searchParams }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id }   = await params;
  const sp       = await searchParams;

  // ── Load exam + class ─────────────────────────────────────────
  const exam = await prisma.exam.findFirst({
    where:   { id, schoolId },
    include: {
      class: {
        include: {
          subjects:  { orderBy: { name: "asc" } },
          sections:  true,
        },
      },
    },
  });
  if (!exam) notFound();

  const subjects = exam.class.subjects;

  // ── Resolve selected subject ───────────────────────────────────
  const selectedSubjectId =
    sp.subjectId && subjects.some((s) => s.id === sp.subjectId)
      ? sp.subjectId
      : subjects[0]?.id;

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // ── Load results for selected subject ─────────────────────────
  const results = selectedSubjectId
    ? await prisma.result.findMany({
        where: { examId: id, subjectId: selectedSubjectId, schoolId },
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true } },
              section: { include: { class: true } },
            },
          },
        },
        orderBy: { marksObtained: "desc" },
      })
    : [];

  // ── Compute summary ───────────────────────────────────────────
  const total   = results.length;
  const sumMarks = results.reduce((a, r) => a + r.marksObtained, 0);
  const sumMax   = results.reduce((a, r) => a + r.maxMarks, 0);
  const avg      = total > 0 && sumMax > 0
    ? Math.round((sumMarks / sumMax) * 1000) / 10
    : 0;
  const passed   = results.filter(
    (r) => r.marksObtained / r.maxMarks >= 0.4,
  ).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // ── Per-subject result counts (for subject selector) ──────────
  const subjectCounts = await prisma.result.groupBy({
    by:    ["subjectId"],
    where: { examId: id, schoolId },
    _count: { id: true },
  });
  const countMap = new Map(
    subjectCounts.map((sc) => [sc.subjectId, sc._count.id]),
  );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/school-admin/exams"
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
              rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {exam.class.name} ·{" "}
              {EXAM_TYPE_LABELS[exam.examType as ExamType]}
            </p>
          </div>
        </div>
        {/* Enter/edit marks link */}
        <Link
          href={`/school-admin/results?examId=${exam.id}${selectedSubjectId ? `&subjectId=${selectedSubjectId}` : ""}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
            font-semibold text-white bg-blue-600 hover:bg-blue-700
            rounded-lg transition-colors shrink-0"
        >
          <Pencil className="w-4 h-4" />
          Enter / Edit Marks
        </Link>
      </div>

      {/* ── Summary stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Students Marked", value: total },
          { label: "Average",         value: `${avg}%` },
          { label: "Passed",          value: passed },
          { label: "Pass Rate",       value: `${passRate}%` },
        ].map((item) => (
          <div key={item.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm
              px-4 py-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Subject selector ───────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase
            tracking-wide mb-3">
            Filter by Subject
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((sub) => {
              const count = countMap.get(sub.id) ?? 0;
              const isSelected = sub.id === selectedSubjectId;
              return (
                <Link
                  key={sub.id}
                  href={`/school-admin/exams/${exam.id}/results?subjectId=${sub.id}`}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs
                    font-semibold rounded-lg border transition-colors
                    ${isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"}`}
                >
                  {sub.name}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                      ${isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-500"}`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results table ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {selectedSubject
              ? `${selectedSubject.name} — Results`
              : "Results"}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} record{total !== 1 ? "s" : ""} found
          </p>
        </div>

        {results.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium text-gray-500">
              No results entered yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedSubject
                ? `No marks have been entered for ${selectedSubject.name}.`
                : "Select a subject to view results."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "#", "Student", "Section",
                    "Marks", "Max", "%", "Grade", "Remarks",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-xs font-semibold text-gray-500
                        uppercase tracking-wide text-left first:w-10"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => {
                  const pct = calcPercentage(r.marksObtained, r.maxMarks);
                  const sec = r.studentProfile.section;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        {r.studentProfile.user.name}
                      </td>
                      <td className="px-4 py-3.5">
                        {sec ? (
                          <span className="px-2 py-0.5 text-xs font-medium
                            bg-blue-50 text-blue-700 rounded-full">
                            {sec.class.name}-{sec.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900
                        tabular-nums">
                        {r.marksObtained}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                        {r.maxMarks}
                      </td>
                      <td className={`px-4 py-3.5 tabular-nums ${pctTextStyle(pct)}`}>
                        {pct}%
                      </td>
                      <td className="px-4 py-3.5">
                        {r.grade ? (
                          <span className={`px-2.5 py-1 text-xs font-bold
                            rounded-full ${gradeStyle(r.grade)}`}>
                            {r.grade}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500
                        max-w-xs truncate">
                        {r.remarks ?? (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
