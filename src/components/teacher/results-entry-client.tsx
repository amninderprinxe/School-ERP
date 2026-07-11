"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { saveResults } from "@/action/result.actions";
import { calcGrade, calcPercentage, gradeStyle } from "@/lib/results-utils";
import { CheckCircle2, AlertCircle, ClipboardCheck, Users } from "lucide-react";

// ── Prop types ────────────────────────────────────────────────────
export interface StudentResultRow {
  id: string;
  name: string;
  rollNumber: string | null;
  admissionNo: string | null;
  existingMarksObtained: number | null;
  existingMaxMarks: number | null;
  existingGrade: string | null;
  existingRemarks: string | null;
}

export interface ExamOption {
  id: string;
  name: string;
  examType: string;
  classId: string;
  class: { id: string; name: string };
}

export interface SectionOption {
  id: string;
  name: string;
  class: { name: string };
}

export interface SubjectOption {
  id: string;
  name: string;
  code: string | null;
}

interface RowState {
  marksObtained: string;
  maxMarks: string;
  grade: string;
  remarks: string;
}

interface Props {
  exams: ExamOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  students: StudentResultRow[];
  selectedExamId: string;
  selectedSectionId: string;
  selectedSubjectId: string;
  hasSelection: boolean;
  basePath ?: string;
}

const DEFAULT_MAX = "100";

// ── Grade badge ───────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  if (!grade) return <span className="text-xs text-gray-300">—</span>;
  return (
    <span
      className={`px-2 py-0.5 text-xs font-bold rounded ${gradeStyle(grade)}`}
    >
      {grade}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
export function ResultsEntryClient({
  exams,
  sections,
  subjects,
  students,
  selectedExamId,
  selectedSectionId,
  selectedSubjectId,
  hasSelection,
  basePath="/teacher/results",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNavPending, startNav] = useTransition();

  // ── Local selection state ──────────────────────────────────────
//   const [localExam, setLocalExam] = useState(selectedExamId);
//   const [localSection, setLocalSection] = useState(selectedSectionId);
//   const [localSubject, setLocalSubject] = useState(selectedSubjectId);

//   useEffect(() => {
//   setLocalExam(selectedExamId);
//   setLocalSection(selectedSectionId);
//   setLocalSubject(selectedSubjectId);
// }, [selectedExamId, selectedSectionId, selectedSubjectId]);

  // ── Per-student mark state ─────────────────────────────────────
  const [rowMap, setRowMap] = useState<Record<string, RowState>>(() => {
    const m: Record<string, RowState> = {};
    for (const s of students) {
      m[s.id] = {
        marksObtained: s.existingMarksObtained?.toString() ?? "",
        maxMarks: s.existingMaxMarks?.toString() ?? DEFAULT_MAX,
        grade: s.existingGrade ?? "",
        remarks: s.existingRemarks ?? "",
      };
    }
    return m;
  });

  // useEffect(() => {
  // const m: Record<string, RowState> = {};

  // for (const s of students) {
  //   m[s.id] = {
  //     marksObtained: s.existingMarksObtained?.toString() ?? "",
  //     maxMarks: s.existingMaxMarks?.toString() ?? DEFAULT_MAX,
  //     grade: s.existingGrade ?? "",
  //     remarks: s.existingRemarks ?? "",
  //   };
  // }

//   setRowMap(m);
// }, [students]);

  // Global max marks control
  const [globalMax, setGlobalMax] = useState(DEFAULT_MAX);

  // UI feedback
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isUpdate = students.some((s) => s.existingMarksObtained !== null);

  // ── Live stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    let marked = 0,
      totalMarks = 0,
      totalMax = 0,
      passed = 0;
    for (const s of students) {
      const m = parseFloat(rowMap[s.id]?.marksObtained ?? "");
      const max = parseFloat(rowMap[s.id]?.maxMarks ?? DEFAULT_MAX);
      if (!isNaN(m) && m >= 0) {
        marked++;
        totalMarks += m;
        totalMax += max;
        if (max > 0 && (m / max) * 100 >= 40) passed++;
      }
    }
    const avg =
      marked > 0 && totalMax > 0
        ? Math.round((totalMarks / totalMax) * 1000) / 10
        : 0;
    const passRate = marked > 0 ? Math.round((passed / marked) * 100) : 0;
    return { marked, avg, passRate, passed };
  }, [rowMap, students]);

  // ── Navigation helpers ─────────────────────────────────────────
  const navigate = (examId: string, sectionId: string, subjectId: string) => {
    setSaved(false);
    setSaveError(null);
    startNav(() => {
      const params = new URLSearchParams();
      if (examId) params.set("examId", examId);
      if (sectionId) params.set("sectionId", sectionId);
      if (subjectId) params.set("subjectId", subjectId);
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  const handleExamChange = (val: string) => {
    // setLocalExam(val);
    // setLocalSection("");
    // setLocalSubject("");
    navigate(val, "", "");
  };

  const handleSectionChange = (val: string) => {
    // setLocalSection(val);
    navigate(selectedExamId, val, selectedSubjectId);
  };

  const handleSubjectChange = (val: string) => {
    // setLocalSubject(val);
    navigate(selectedExamId, selectedSectionId, val);
  };

  // ── Per-row update ─────────────────────────────────────────────
  const updateMarks = (id: string, marks: string) => {
    setSaved(false);
    setRowMap((prev) => {
      const row = { ...prev[id]! };
      row.marksObtained = marks;
      const m = parseFloat(marks);
      const max = parseFloat(row.maxMarks) || 100;
      row.grade = !isNaN(m) && m >= 0 ? calcGrade(m, max) : "";
      return { ...prev, [id]: row };
    });
  };

  const updateRowMax = (id: string, max: string) => {
    setRowMap((prev) => {
      const row = { ...prev[id]! };
      row.maxMarks = max;
      const m = parseFloat(row.marksObtained);
      const mx = parseFloat(max) || 100;
      if (!isNaN(m) && m >= 0) row.grade = calcGrade(m, mx);
      return { ...prev, [id]: row };
    });
  };

  const updateGrade = (id: string, val: string) =>
    setRowMap((prev) => ({ ...prev, [id]: { ...prev[id]!, grade: val } }));

  const updateRemarks = (id: string, val: string) =>
    setRowMap((prev) => ({ ...prev, [id]: { ...prev[id]!, remarks: val } }));

  // ── Apply global max marks to all rows ─────────────────────────
  const applyGlobalMax = () => {
    const mx = parseFloat(globalMax);
    if (isNaN(mx) || mx <= 0) return;
    setRowMap((prev) => {
      const updated = { ...prev };
      for (const id of Object.keys(updated)) {
        const row = { ...updated[id]! };
        row.maxMarks = globalMax;
        const m = parseFloat(row.marksObtained);
        if (!isNaN(m) && m >= 0) row.grade = calcGrade(m, mx);
        updated[id] = row;
      }
      return updated;
    });
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    setSaved(false);
    setSaveError(null);

    const entries = students
      .filter((s) => {
        const m = parseFloat(rowMap[s.id]?.marksObtained ?? "");
        return !isNaN(m) && m >= 0;
      })
      .map((s) => ({
        studentProfileId: s.id,
        marksObtained: parseFloat(rowMap[s.id]?.marksObtained ?? "0"),
        maxMarks: parseFloat(rowMap[s.id]?.maxMarks ?? DEFAULT_MAX) || 100,
        grade: rowMap[s.id]?.grade?.trim() || undefined,
        remarks: rowMap[s.id]?.remarks?.trim() || undefined,
      }));

    if (entries.length === 0) {
      setSaveError("Please enter marks for at least one student.");
      return;
    }

    startTransition(async () => {
      const res = await saveResults({
        examId: selectedExamId,
        subjectId: selectedSubjectId,
        sectionId: selectedSectionId,
        entries,
      });
      if (res.success) {
        setSaved(true);
        router.refresh();
      } else {
        setSaveError(res.error);
      }
    });
  };

  // ── INPUT style ────────────────────────────────────────────────
  const NUM_INPUT =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
    "appearance-none [&::-webkit-inner-spin-button]:appearance-none " +
    "[&::-webkit-outer-spin-button]:appearance-none";

  const SEL_INPUT =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
    "disabled:bg-gray-50 disabled:text-gray-400";

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enter Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select an exam, section, and subject to begin entering marks
        </p>
      </div>

      {/* ── Selection card ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Exam */}
          <div>
            <label
              className="block text-xs font-semibold text-gray-500
              uppercase tracking-wide mb-1.5"
            >
              Exam
            </label>
            {exams.length === 0 ? (
              <p
                className="text-sm text-amber-600 bg-amber-50 border
                border-amber-200 rounded-lg px-3 py-2.5"
              >
                No exams found. Create one first.
              </p>
            ) : (
              <select
                value={selectedExamId}
                onChange={(e) => handleExamChange(e.target.value)}
                disabled={isNavPending}
                className={SEL_INPUT}
              >
                <option value="">— Select exam —</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.class.name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section */}
          <div>
            <label
              className="block text-xs font-semibold text-gray-500
              uppercase tracking-wide mb-1.5"
            >
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={!selectedExamId || sections.length === 0 || isNavPending}
              className={SEL_INPUT}
            >
              <option value="">
                {!selectedExamId
                  ? "— Select exam first —"
                  : sections.length === 0
                    ? "— No sections —"
                    : "— Select section —"}
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label
              className="block text-xs font-semibold text-gray-500
              uppercase tracking-wide mb-1.5"
            >
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!selectedExamId || subjects.length === 0 || isNavPending}
              className={SEL_INPUT}
            >
              <option value="">
                {!selectedExamId
                  ? "— Select exam first —"
                  : subjects.length === 0
                    ? "— No subjects —"
                    : "— Select subject —"}
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading indicator */}
        {isNavPending && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
            <svg
              className="animate-spin h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Loading students…
          </div>
        )}
      </div>

      {/* ── Empty prompt ─────────────────────────────────────── */}
      {!hasSelection && !isNavPending && (
        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center"
        >
          <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No selection made</p>
          <p className="text-xs text-gray-400 mt-1">
            Choose an exam, section, and subject above to load students.
          </p>
        </div>
      )}

      {/* ── Marks entry area ─────────────────────────────────── */}
      {hasSelection && !isNavPending && (
        <>
          {/* Update notice */}
          {isUpdate && (
            <div
              className="flex items-center gap-2.5 p-3.5 bg-blue-50
              border border-blue-100 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700">
                Marks are already entered for this selection. Saving will update
                existing records.
              </p>
            </div>
          )}

          {/* No students */}
          {students.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-gray-100
              shadow-sm py-14 text-center"
            >
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                No students in this section
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ask a School Admin to assign students to this section.
              </p>
            </div>
          ) : (
            <>
              {/* ── Live stats bar ────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total Students",
                    value: students.length,
                    color: "text-gray-900",
                  },
                  {
                    label: "Marks Entered",
                    value: `${stats.marked} / ${students.length}`,
                    color: "text-blue-700",
                  },
                  {
                    label: "Average",
                    value: `${stats.avg}%`,
                    color:
                      stats.avg >= 50 ? "text-emerald-700" : "text-red-600",
                  },
                  {
                    label: "Pass Rate",
                    value: `${stats.passRate}%`,
                    color:
                      stats.passRate >= 50
                        ? "text-emerald-700"
                        : "text-red-600",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white rounded-xl border border-gray-100
                      shadow-sm px-4 py-3 text-center"
                  >
                    <p className={`text-2xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Global max marks setter ───────────────── */}
              <div
                className="bg-white rounded-xl border border-gray-100
                shadow-sm p-4 flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-40">
                  <label
                    className="block text-xs font-semibold text-gray-500
                    uppercase tracking-wide mb-1.5"
                  >
                    Set Max Marks for All Students
                  </label>
                  <input
                    type="number"
                    value={globalMax}
                    min={1}
                    max={9999}
                    onChange={(e) => setGlobalMax(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3
                      py-2 text-sm focus:outline-none focus:ring-2
                      focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyGlobalMax}
                  className="px-5 py-2.5 text-sm font-semibold text-white
                    bg-gray-700 hover:bg-gray-900 rounded-lg transition-colors"
                >
                  Apply to All
                </button>
              </div>

              {/* ── Student marks table ───────────────────── */}
              <div
                className="bg-white rounded-xl border border-gray-100
                shadow-sm overflow-hidden"
              >
                {/* Table header */}
                <div
                  className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50
                  border-b border-gray-100 text-xs font-semibold text-gray-500
                  uppercase tracking-wide"
                >
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-3">Student</div>
                  <div className="col-span-2 text-center">Marks</div>
                  <div className="col-span-2 text-center">Max Marks</div>
                  <div className="col-span-1 text-center">%</div>
                  <div className="col-span-1 text-center">Grade</div>
                  <div className="col-span-2">Remarks</div>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-gray-50">
                  {students.map((student, idx) => {
                    const row = rowMap[student.id]!;
                    const m = parseFloat(row.marksObtained);
                    const mx = parseFloat(row.maxMarks) || 100;
                    const pct =
                      !isNaN(m) && m >= 0 ? calcPercentage(m, mx) : null;
                    const grade = row.grade;
                    const isOver = !isNaN(m) && m > mx;

                    return (
                      <div
                        key={student.id}
                        className={`grid grid-cols-12 gap-2 px-5 py-3
                          items-center transition-colors
                          ${isOver ? "bg-red-50/40" : "hover:bg-gray-50/50"}`}
                      >
                        {/* Index */}
                        <div
                          className="col-span-1 text-xs text-gray-400
                          text-center font-medium"
                        >
                          {idx + 1}
                        </div>

                        {/* Name + roll */}
                        <div className="col-span-3 min-w-0">
                          <p
                            className="text-sm font-medium text-gray-900
                            truncate leading-tight"
                          >
                            {student.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {student.rollNumber
                              ? `Roll: ${student.rollNumber}`
                              : student.admissionNo
                                ? `Adm: ${student.admissionNo}`
                                : "—"}
                          </p>
                        </div>

                        {/* Marks obtained */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={row.marksObtained}
                            min={0}
                            max={mx}
                            step="0.5"
                            placeholder="—"
                            onChange={(e) =>
                              updateMarks(student.id, e.target.value)
                            }
                            className={`${NUM_INPUT} ${isOver ? "border-red-400 focus:ring-red-400" : ""}`}
                          />
                          {isOver && (
                            <p className="text-[10px] text-red-500 mt-0.5 text-center">
                              Exceeds max
                            </p>
                          )}
                        </div>

                        {/* Max marks */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={row.maxMarks}
                            min={1}
                            max={9999}
                            step="1"
                            onChange={(e) =>
                              updateRowMax(student.id, e.target.value)
                            }
                            className={NUM_INPUT}
                          />
                        </div>

                        {/* Percentage */}
                        <div className="col-span-1 text-center">
                          {pct !== null ? (
                            <span
                              className={`text-xs tabular-nums
                              ${
                                pct >= 75
                                  ? "text-emerald-600"
                                  : pct >= 40
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }`}
                            >
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>

                        {/* Grade (editable, auto-filled) */}
                        <div className="col-span-1 text-center">
                          {grade ? (
                            <GradeBadge grade={grade} />
                          ) : (
                            <input
                              type="text"
                              value={row.grade}
                              maxLength={3}
                              placeholder="—"
                              onChange={(e) =>
                                updateGrade(
                                  student.id,
                                  e.target.value.toUpperCase(),
                                )
                              }
                              className="w-full border border-gray-200 rounded
                                px-1.5 py-1 text-xs text-center focus:outline-none
                                focus:ring-1 focus:ring-blue-400"
                            />
                          )}
                        </div>

                        {/* Remarks */}
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={row.remarks}
                            placeholder="Optional…"
                            maxLength={300}
                            onChange={(e) =>
                              updateRemarks(student.id, e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-lg
                              px-2 py-1.5 text-xs placeholder-gray-300
                              focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Success / error banners ───────────────── */}
              {saved && (
                <div
                  className="flex items-start gap-3 p-4 bg-green-50
                  border border-green-200 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Results saved successfully!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {stats.marked} student
                      {stats.marked !== 1 ? "s" : ""} marked — average{" "}
                      {stats.avg}%.
                    </p>
                  </div>
                </div>
              )}

              {saveError && (
                <div
                  className="flex items-start gap-3 p-4 bg-red-50
                  border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">
                    {saveError}
                  </p>
                </div>
              )}

              {/* ── Footer: count + save ──────────────────── */}
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-gray-400">
                  {stats.marked} / {students.length} students have marks entered
                  {isUpdate && (
                    <span
                      className="ml-2 px-1.5 py-0.5 bg-blue-50
                      text-blue-600 text-xs font-medium rounded"
                    >
                      Updating
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || students.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5
                    bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                    disabled:cursor-not-allowed text-white text-sm font-semibold
                    rounded-lg transition-colors focus:outline-none focus:ring-2
                    focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      {isUpdate ? "Update Results" : "Save Results"}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
