// ── READ-ONLY results view for SCHOOL_ADMIN ───────────────────────
// No ResultsEntryClient, no saveResults, no input fields.
import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import {
  calcPercentage,
  gradeStyle,
  pctTextStyle,
} from "@/lib/results-utils";
import { EXAM_TYPE_LABELS } from "@/lib/validations/exam";
import type { ExamType } from "@prisma/client";

export const metadata = { title: "Results Overview" };

interface Props {
  searchParams: Promise<{
    examId?: string;
    subjectId?: string;
    sectionId?: string;
  }>;
}


export default async function SchoolAdminResultsPage({
  searchParams,
}: Props) {
  // ── SCHOOL_ADMIN only — no marks entry allowed here ────────────
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const sp = await searchParams;

  const { examId, subjectId, sectionId } = sp;

  // ── Load exams first ────────────────────────────────────────────
  const exams = await prisma.exam.findMany({
    where: { schoolId },
    include: { class: true },
    orderBy: { createdAt: "desc" },
  });

  // ── Resolve selected exam metadata ──────────────────────────────
  const selectedExam = exams.find((e) => e.id === examId);

  // ── Load subjects + sections only after selected exam is known ──
  const [subjects, sections] = selectedExam
    ? await Promise.all([
      prisma.subject.findMany({
        where: {
          schoolId,
          classId: selectedExam.classId,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.section.findMany({
        where: {
          schoolId,
          classId: selectedExam.classId,
        },
        include: {
          class: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ])
    : [[], []];



  // ── Load results ──────────────────────────────────────────────
  const results = await prisma.result.findMany({
    where: {
      schoolId,
      ...(examId && { examId }),
      ...(subjectId && { subjectId }),
      ...(sectionId && {
        studentProfile: { sectionId },
      }),
    },
    include: {
      exam: { include: { class: true } },
      subject: true,
      studentProfile: {
        include: {
          user: { select: { name: true, email: true } },
          section: { include: { class: true } },
        },
      },
    },
    orderBy: [
      { exam: { name: "asc" } },
      { subject: { name: "asc" } },
      { marksObtained: "desc" },
    ],
    take: 500,
  });

  // ── Build summary ─────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter(
    (r) => r.marksObtained / r.maxMarks >= 0.4,
  ).length;
  const avgPct =
    total > 0
      ? Math.round(
        (results.reduce(
          (sum, r) => sum + calcPercentage(r.marksObtained, r.maxMarks),
          0,
        ) /
          total) *
        10,
      ) / 10
      : 0;

  // ── Current filter label ──────────────────────────────────────
  const filterLabel = selectedExam
    ? `${selectedExam.name} — ${selectedExam.class.name}`
    : "All Exams";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Read-only view of all student results
          </p>
        </div>

        {/* Link to exams page for management */}
        <Link
          href="/school-admin/exams"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
            font-semibold text-gray-700 bg-white border border-gray-200
            hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
        >
          <ClipboardCheck className="w-4 h-4" />
          Manage Exams
        </Link>
      </div>

      {/* ── Filters (plain GET form — no server actions) ──────── */}
      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
      >
        <div className="flex flex-wrap gap-3">

          {/* Exam filter */}
          <div className="relative flex-1 min-w-48">
            <select
              name="examId"
              defaultValue={examId ?? ""}
              className="w-full appearance-none border border-gray-300
                rounded-lg px-3 py-2.5 pr-9 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent"
            >
              <option value="">All Exams</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.class.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Subject filter (only when exam selected) */}
          {subjects.length > 0 && (
            <div className="relative flex-1 min-w-36">
              <select
                name="subjectId"
                defaultValue={subjectId ?? ""}
                className="w-full appearance-none border border-gray-300
                  rounded-lg px-3 py-2.5 pr-9 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Section filter (only when exam selected) */}
          {sections.length > 0 && (
            <div className="relative flex-1 min-w-36">
              <select
                name="sectionId"
                defaultValue={sectionId ?? ""}
                className="w-full appearance-none border border-gray-300
                  rounded-lg px-3 py-2.5 pr-9 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
              text-sm font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>

          <a href="/school-admin/results"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600
              text-sm font-medium rounded-lg transition-colors inline-flex
              items-center"
          >
            Clear
          </a>
        </div>
      </form>

      {/* ── Summary cards ──────────────────────────────────── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Records", value: total },
            { label: "Average %", value: `${avgPct}%` },
            { label: "Passed", value: passed },
            { label: "Pass Rate", value: `${total > 0 ? Math.round((passed / total) * 100) : 0}%` },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm
                px-4 py-3 text-center"
            >
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── READ-ONLY Results table ────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center
          justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {filterLabel}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {total} result{total !== 1 ? "s" : ""} found
              {total >= 500 && " (showing first 500 — use filters to narrow down)"}
            </p>
          </div>
        </div>

        {total === 0 ? (
          <div className="py-16 text-center">
            <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No results found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {exams.length === 0
                ? "Create exams first, then teachers can enter marks."
                : "No marks have been entered yet for the selected filters."}
            </p>
            {exams.length === 0 && (
              <Link
                href="/school-admin/exams/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
                  text-xs font-semibold text-blue-600 bg-blue-50
                  hover:bg-blue-100 rounded-lg transition-colors"
              >
                Create First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "#",
                    "Student",
                    "Section",
                    "Exam",
                    "Subject",
                    "Marks",
                    "%",
                    "Grade",
                    "Remarks",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-xs font-semibold text-gray-500
                        uppercase tracking-wide text-left first:w-8"
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
                      {/* # */}
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {i + 1}
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">
                          {r.studentProfile.user.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">
                          {r.studentProfile.user.email}
                        </p>
                      </td>

                      {/* Section */}
                      <td className="px-4 py-3.5">
                        {sec ? (
                          <span className="px-2 py-0.5 text-xs font-medium
                            bg-blue-50 text-blue-700 rounded-full whitespace-nowrap">
                            {sec.class.name}-{sec.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Exam */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700 truncate max-w-[140px]">
                          {r.exam.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {EXAM_TYPE_LABELS[r.exam.examType as ExamType]}
                        </p>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-medium
                          bg-orange-50 text-orange-700 rounded-full">
                          {r.subject.name}
                        </span>
                      </td>

                      {/* Marks */}
                      <td className="px-4 py-3.5 tabular-nums">
                        <span className="font-semibold text-gray-900">
                          {r.marksObtained}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {" "}/{r.maxMarks}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className={`px-4 py-3.5 tabular-nums ${pctTextStyle(pct)}`}>
                        {pct}%
                      </td>

                      {/* Grade */}
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


                      <PdfDownloadButton
                        href={`/api/pdf/report-card?studentProfileId=${r.studentProfile.id}`}
                        variant="icon"
                        label="Download Report Card"
                      />

                      {/* Remarks */}
                      <td className="px-4 py-3.5 text-xs text-gray-500
                        max-w-[160px] truncate">
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
