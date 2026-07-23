import type { ExamType }      from "@prisma/client";
import { EXAM_TYPE_LABELS }   from "@/lib/validations/exam";
import {
  calcPercentage,
  gradeStyle,
  pctTextStyle,
}                             from "@/lib/results-utils";
import { CalendarDays, ClipboardList } from "lucide-react";

// ── Shared types ──────────────────────────────────────────────────
export interface SubjectResult {
  id:            string;
  subjectName:   string;
  subjectCode:   string | null;
  marksObtained: number;
  maxMarks:      number;
  grade:         string | null;
  remarks:       string | null;
}

export interface ExamResultGroup {
  examId:    string;
  examName:  string;
  examType:  ExamType;
  className: string;
  startDate: Date | null;
  endDate:   Date | null;
  results:   SubjectResult[];
}

interface Props {
  group: ExamResultGroup;
}

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

// ── Exam type color ───────────────────────────────────────────────
const EXAM_TYPE_COLOR: Record<ExamType, string> = {
  UNIT_TEST:  "bg-blue-600",
  MID_TERM:   "bg-indigo-600",
  FINAL:      "bg-purple-700",
  ASSIGNMENT: "bg-green-600",
  PRACTICAL:  "bg-orange-600",
  OTHER:      "bg-gray-600",
};

const EXAM_TYPE_BADGE: Record<ExamType, string> = {
  UNIT_TEST:  "bg-blue-50 text-blue-700",
  MID_TERM:   "bg-indigo-50 text-indigo-700",
  FINAL:      "bg-purple-50 text-purple-700",
  ASSIGNMENT: "bg-green-50 text-green-700",
  PRACTICAL:  "bg-orange-50 text-orange-700",
  OTHER:      "bg-gray-100 text-gray-600",
};

// ─────────────────────────────────────────────────────────────────
export function ExamResultCard({ group }: Props) {
  const totalObtained = group.results.reduce(
    (sum, r) => sum + r.marksObtained, 0,
  );
  const totalMax = group.results.reduce((sum, r) => sum + r.maxMarks, 0);
  const overallPct = calcPercentage(totalObtained, totalMax);

  // Pass = marks ≥ 40% in EVERY subject
  const isPassing = group.results.length > 0 &&
    group.results.every((r) => r.marksObtained / r.maxMarks >= 0.4);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm
      overflow-hidden">

      {/* ── Exam header ─────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">

          {/* Left: icon + name + meta */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 ${EXAM_TYPE_COLOR[group.examType]}
              rounded-xl flex items-center justify-center shrink-0 shadow`}>
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {group.examName}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`px-2 py-0.5 text-xs font-semibold
                  rounded-full ${EXAM_TYPE_BADGE[group.examType]}`}>
                  {EXAM_TYPE_LABELS[group.examType]}
                </span>
                <span className="text-xs text-gray-400">{group.className}</span>
                {(group.startDate || group.endDate) && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays className="w-3 h-3" />
                    {group.startDate ? formatDate(group.startDate) : ""}
                    {group.startDate && group.endDate ? " – " : ""}
                    {group.endDate ? formatDate(group.endDate) : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: overall stats */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="text-center">
              <p className={`text-3xl font-black ${pctTextStyle(overallPct)}`}>
                {overallPct}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Overall</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {fmt(totalObtained)}
                <span className="text-gray-400 text-sm font-medium">
                  /{fmt(totalMax)}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Total Marks</p>
            </div>
            <span className={`px-3 py-1.5 text-xs font-bold rounded-full
              border ${isPassing
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-600 border-red-200"}`}>
              {isPassing ? "PASS" : "FAIL"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Subject breakdown table ──────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                "Subject", "Marks Obtained", "Max Marks", "%", "Grade", "Remarks",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-xs font-semibold text-gray-500
                    uppercase tracking-wide text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {group.results.map((r) => {
              const pct      = calcPercentage(r.marksObtained, r.maxMarks);
              const subPassed = r.marksObtained / r.maxMarks >= 0.4;
              return (
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    !subPassed ? "bg-red-50/20" : "hover:bg-gray-50/50"
                  }`}
                >
                  {/* Subject */}
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">
                      {r.subjectName}
                    </p>
                    {r.subjectCode && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        {r.subjectCode}
                      </p>
                    )}
                  </td>

                  {/* Marks obtained */}
                  <td className="px-5 py-3.5 font-semibold text-gray-900
                    tabular-nums">
                    {fmt(r.marksObtained)}
                  </td>

                  {/* Max marks */}
                  <td className="px-5 py-3.5 text-gray-500 tabular-nums">
                    {fmt(r.maxMarks)}
                  </td>

                  {/* Percentage */}
                  <td className={`px-5 py-3.5 tabular-nums font-semibold
                    ${pctTextStyle(pct)}`}>
                    {pct}%
                  </td>

                  {/* Grade */}
                  <td className="px-5 py-3.5">
                    {r.grade ? (
                      <span className={`px-2.5 py-1 text-xs font-bold
                        rounded-full ${gradeStyle(r.grade)}`}>
                        {r.grade}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Remarks */}
                  <td className="px-5 py-3.5 text-xs text-gray-500
                    max-w-[200px] truncate">
                    {r.remarks ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Total row */}
          {group.results.length > 1 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-5 py-3 font-bold text-gray-900 text-sm">
                  Total
                </td>
                <td className={`px-5 py-3 font-bold tabular-nums
                  ${pctTextStyle(overallPct)}`}>
                  {fmt(totalObtained)}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-600
                  tabular-nums">
                  {fmt(totalMax)}
                </td>
                <td className={`px-5 py-3 font-bold tabular-nums
                  ${pctTextStyle(overallPct)}`}>
                  {overallPct}%
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
