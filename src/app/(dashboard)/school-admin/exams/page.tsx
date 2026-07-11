import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import Link             from "next/link";
import { RowActions }   from "@/components/ui/row-actions";
import { deleteExam }   from "@/action/exam.actions";
import {
  ClipboardList,
  Plus,
  CalendarDays,
  BarChart2,
}                       from "lucide-react";
import { EXAM_TYPE_LABELS } from "@/lib/validations/exam";
import type { ExamType }    from "@prisma/client";

export const metadata = { title: "Exams" };

const EXAM_TYPE_STYLE: Record<ExamType, string> = {
  UNIT_TEST:  "bg-blue-50 text-blue-700",
  MID_TERM:   "bg-indigo-50 text-indigo-700",
  FINAL:      "bg-purple-50 text-purple-700",
  ASSIGNMENT: "bg-green-50 text-green-700",
  PRACTICAL:  "bg-orange-50 text-orange-700",
  OTHER:      "bg-gray-100 text-gray-600",
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

export default async function ExamsPage() {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const exams = await prisma.exam.findMany({
    where:   { schoolId },
    include: {
      class:   true,
      _count:  { select: { results: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // Summarise counts by type
  const typeCounts = exams.reduce<Record<string, number>>(
    (acc, e) => ({ ...acc, [e.examType]: (acc[e.examType] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {exams.length} exam{exams.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link
          href="/school-admin/exams/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
            transition-colors focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </Link>
      </div>

      {/* ── Type summary strip ─────────────────────────────── */}
      {exams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeCounts).map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5
                text-xs font-semibold rounded-full
                ${EXAM_TYPE_STYLE[type as ExamType]}`}
            >
              {EXAM_TYPE_LABELS[type as ExamType]}
              <span className="font-bold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Table card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        {exams.length === 0 ? (
          /* Empty state */
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No exams yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first exam to start entering student results.
            </p>
            <Link
              href="/school-admin/exams/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
                text-xs font-semibold text-blue-600 bg-blue-50
                hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create first exam
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Head */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Exam",
                    "Type",
                    "Class",
                    "Start Date",
                    "End Date",
                    "Results",
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
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Exam name */}
                    <td className="px-5 py-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex
                          items-center justify-center shrink-0">
                          <ClipboardList className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {exam.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            Created{" "}
                            {new Date(exam.createdAt).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short", year: "numeric" },
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs
                          font-semibold rounded-full
                          ${EXAM_TYPE_STYLE[exam.examType]}`}
                      >
                        {EXAM_TYPE_LABELS[exam.examType]}
                      </span>
                    </td>

                    {/* Class badge */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium
                        bg-blue-50 text-blue-700 rounded-full">
                        {exam.class.name}
                      </span>
                    </td>

                    {/* Start date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {exam.startDate && (
                          <CalendarDays className="w-3.5 h-3.5 text-gray-300
                            shrink-0" />
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(exam.startDate)}
                        </span>
                      </div>
                    </td>

                    {/* End date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDate(exam.endDate)}
                      </span>
                    </td>

                    {/* Result count */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium
                            rounded-full
                            ${exam._count.results > 0
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-400"}`}
                        >
                          {exam._count.results} result
                          {exam._count.results !== 1 ? "s" : ""}
                        </span>
                        {/* View results link (Chunk 3) */}
                        {exam._count.results > 0 && (
                          <Link
                            href={`/school-admin/exams/${exam.id}/results`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600
                              hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Results"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Row actions */}
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/exams/${exam.id}/edit`}
                        deleteAction={deleteExam.bind(null, exam.id)}
                        entityLabel={
                          exam._count.results > 0
                            ? `exam "${exam.name}" and its ${exam._count.results} result records`
                            : `exam "${exam.name}"`
                        }
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