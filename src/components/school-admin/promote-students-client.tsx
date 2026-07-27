"use client";

import {
  useState,
  useTransition,
  useMemo,
}                                 from "react";
import {
  getStudentsForPromotion,
  promoteStudents,
}                                 from "@/action/promote.actions";
import type { StudentForPromotion } from "@/lib/validations/promote";
import {
  TrendingUp,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Users,
  RotateCcw,
}                                 from "lucide-react";

// ── Prop types ────────────────────────────────────────────────────

export interface ClassOption {
  id:       string;
  name:     string;
  sections: { id: string; name: string }[];
}

interface Props {
  classes: ClassOption[];
}

// ── Wizard steps ─────────────────────────────────────────────────
type Step = "setup" | "review" | "done";

const SELECT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "disabled:bg-gray-50 disabled:text-gray-400";

const LABEL = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

// ─────────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "setup",  label: "Configure" },
    { key: "review", label: "Review"    },
    { key: "done",   label: "Complete"  },
  ];
  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold transition-colors
                ${i < idx
                  ? "bg-blue-600 text-white"
                  : i === idx
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-gray-200 text-gray-500"}`}
            >
              {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:block
                ${i <= idx ? "text-blue-700" : "text-gray-400"}`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-2 transition-colors
                ${i < idx ? "bg-blue-600" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function PromoteStudentsClient({ classes }: Props) {
  // ── Wizard state ──────────────────────────────────────────────
  const [step, setStep] = useState<Step>("setup");

  // Setup fields
  const [sourceClassId,   setSourceClassId]   = useState("");
  const [sourceSectionId, setSourceSectionId] = useState("");
  const [targetClassId,   setTargetClassId]   = useState("");
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [graduate,        setGraduate]        = useState(false);
  const [deactivate,      setDeactivate]      = useState(false);

  // Review state
  const [students,     setStudents]    = useState<StudentForPromotion[]>([]);
  const [selectedIds,  setSelectedIds] = useState<Set<string>>(new Set());

  // Feedback
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [result,     setResult]     = useState<{
    promoted: number; graduated: number;
  } | null>(null);

  const [isLoading, startLoad] = useTransition();
  const [isSaving,  startSave] = useTransition();

  // ── Derived ──────────────────────────────────────────────────
  const sourceSections = useMemo(
    () => classes.find((c) => c.id === sourceClassId)?.sections ?? [],
    [classes, sourceClassId],
  );

  const targetSections = useMemo(
    () => classes.find((c) => c.id === targetClassId)?.sections ?? [],
    [classes, targetClassId],
  );

  const targetLabel = useMemo(() => {
    if (graduate) return "Graduate";
    if (!targetSectionId) return null;
    const cls = classes.find((c) => c.id === targetClassId);
    const sec = cls?.sections.find((s) => s.id === targetSectionId);
    return cls && sec ? `${cls.name} — Section ${sec.name}` : null;
  }, [graduate, targetSectionId, targetClassId, classes]);

  const sourceSectionLabel = useMemo(() => {
    const cls = classes.find((c) => c.id === sourceClassId);
    const sec = cls?.sections.find((s) => s.id === sourceSectionId);
    return cls && sec ? `${cls.name} — Section ${sec.name}` : null;
  }, [classes, sourceClassId, sourceSectionId]);

  const selectedCount  = selectedIds.size;
  const canSetup       = !!sourceSectionId && (graduate || !!targetSectionId);
  const canPromote     = selectedCount > 0 && !isSaving;

  // ── Step 1 → Step 2: load students ───────────────────────────
  const handleLoadStudents = () => {
    if (!sourceSectionId) return;
    setLoadError(null);
    startLoad(async () => {
      const res = await getStudentsForPromotion(sourceSectionId);
      if (res.success && res.data) {
        const studentList = res.data as StudentForPromotion[];
        setStudents(studentList);
        setSelectedIds(new Set(studentList.map((s) => s.id)));
        setStep("review");
      } else {
        setLoadError(res.error);
      }
    });
  };

  // ── Select / deselect ─────────────────────────────────────────
  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  // ── Step 2 → Step 3: execute ──────────────────────────────────
  const handlePromote = () => {
    setSaveError(null);
    startSave(async () => {
      const res = await promoteStudents({
        studentProfileIds: Array.from(selectedIds),
        targetSectionId:   graduate ? null : targetSectionId,
        deactivate,
      });
      if (res.success && res.data) {
        setResult(res.data as unknown as { promoted: number; graduated: number });
        setStep("done");
      } else {
        setSaveError(res.error);
      }
    });
  };

  // ── Reset wizard ──────────────────────────────────────────────
  const handleReset = () => {
    setStep("setup");
    setSourceClassId("");
    setSourceSectionId("");
    setTargetClassId("");
    setTargetSectionId(null);
    setGraduate(false);
    setDeactivate(false);
    setStudents([]);
    setSelectedIds(new Set());
    setLoadError(null);
    setSaveError(null);
    setResult(null);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bulk Student Promotion
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Move students to the next class or mark them as graduated at year-end
        </p>
      </div>

      {/* ── Step indicator ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <StepIndicator current={step} />
        {step !== "setup" && step !== "done" && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
              font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100
              rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          STEP 1 — SETUP
         ═══════════════════════════════════════════════════════ */}
      {step === "setup" && (
        <div className="space-y-5">

          {/* Source */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white
                text-xs font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <p className="text-sm font-bold text-gray-900">
                Select Source Section
              </p>
              <p className="text-xs text-gray-400">
                — where the students currently are
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Source Class</label>
                <select
                  value={sourceClassId}
                  onChange={(e) => {
                    setSourceClassId(e.target.value);
                    setSourceSectionId("");
                  }}
                  className={SELECT}
                >
                  <option value="">— Select class —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL}>Source Section</label>
                <select
                  value={sourceSectionId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                  disabled={!sourceClassId || sourceSections.length === 0}
                  className={SELECT}
                >
                  <option value="">— Select section —</option>
                  {sourceSections.map((s) => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
                {sourceClassId && sourceSections.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No sections in this class.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white
                text-xs font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <p className="text-sm font-bold text-gray-900">
                Select Destination
              </p>
              <p className="text-xs text-gray-400">
                — where students will go
              </p>
            </div>

            {/* Graduate toggle */}
            <div
              onClick={() => {
                setGraduate((prev) => {
                  if (!prev) {
                    setTargetClassId("");
                    setTargetSectionId(null);
                  }
                  return !prev;
                });
              }}
              className={`flex items-start gap-3 p-4 rounded-xl border-2
                cursor-pointer transition-colors mb-4 select-none
                ${graduate
                  ? "border-purple-400 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}
            >
              <input
                type="checkbox"
                checked={graduate}
                onChange={() => {}}
                className="mt-0.5 w-4 h-4 text-purple-600 rounded"
              />
              <div>
                <p className={`text-sm font-semibold ${
                  graduate ? "text-purple-900" : "text-gray-700"
                }`}>
                  <GraduationCap className="w-4 h-4 inline mr-1.5 mb-0.5" />
                  Graduate students (no next section)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Students will no longer be assigned to a section.
                  Use this for final-year students leaving the school.
                </p>
              </div>
            </div>

            {/* Normal promotion */}
            {!graduate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Target Class</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => {
                      setTargetClassId(e.target.value);
                      setTargetSectionId(null);
                    }}
                    className={SELECT}
                  >
                    <option value="">— Select class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL}>Target Section</label>
                  <select
                    value={targetSectionId ?? ""}
                    onChange={(e) => setTargetSectionId(e.target.value || null)}
                    disabled={!targetClassId || targetSections.length === 0}
                    className={SELECT}
                  >
                    <option value="">— Select section —</option>
                    {targetSections.map((s) => (
                      <option key={s.id} value={s.id}>Section {s.name}</option>
                    ))}
                  </select>
                  {targetClassId && targetSections.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No sections in this class.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Deactivate option (only for graduates) */}
            {graduate && (
              <div
                onClick={() => setDeactivate((prev) => !prev)}
                className={`flex items-start gap-3 p-4 rounded-xl border
                  cursor-pointer transition-colors mt-3 select-none
                  ${deactivate
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"}`}
              >
                <input
                  type="checkbox"
                  checked={deactivate}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 text-red-600 rounded"
                />
                <div>
                  <p className={`text-sm font-semibold ${
                    deactivate ? "text-red-800" : "text-gray-700"
                  }`}>
                    Also deactivate student accounts
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Prevents students from logging in. Their historical data
                    (attendance, results, fees) is preserved.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Summary + Load button */}
          {canSetup && sourceSectionLabel && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4
              flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Ready to load students from{" "}
                  <span className="text-blue-700">{sourceSectionLabel}</span>
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  They will be moved to{" "}
                  <span className="font-semibold">
                    {graduate ? "Graduate (no section)" : targetLabel}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadStudents}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5
                  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                  text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none"
                      viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  <>
                    Load Students
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border
              border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 font-medium">{loadError}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STEP 2 — REVIEW
         ═══════════════════════════════════════════════════════ */}
      {step === "review" && (
        <div className="space-y-5">

          {/* Route summary banner */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r
            from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
            <div className="text-center shrink-0">
              <p className="text-xs font-semibold text-blue-500 uppercase
                tracking-wide">
                From
              </p>
              <p className="text-sm font-bold text-blue-900 mt-0.5">
                {sourceSectionLabel}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400 shrink-0 mx-1" />
            <div className="text-center shrink-0">
              <p className="text-xs font-semibold text-indigo-500 uppercase
                tracking-wide">
                To
              </p>
              <p className={`text-sm font-bold mt-0.5 ${
                graduate ? "text-purple-800" : "text-indigo-900"
              }`}>
                {graduate ? "Graduate" : targetLabel}
              </p>
            </div>
            {graduate && deactivate && (
              <>
                <span className="text-gray-300 mx-1">+</span>
                <span className="px-2.5 py-1 text-xs font-semibold bg-red-100
                  text-red-700 rounded-full shrink-0">
                  Deactivate Accounts
                </span>
              </>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm
            overflow-hidden">

            {/* Table toolbar */}
            <div className="flex items-center justify-between px-5 py-4
              border-b border-gray-100">
              <div className="flex items-center gap-3">
                {/* Select all checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.size === students.length && students.length > 0}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedIds.size > 0 &&
                        selectedIds.size < students.length;
                    }
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300
                    focus:ring-blue-500"
                  aria-label="Select all students"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {students.length} student
                    {students.length !== 1 ? "s" : ""} in this section
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedCount} of {students.length} selected for promotion
                  </p>
                </div>
              </div>

              {/* Selection info */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 text-sm font-bold rounded-full
                  ${selectedCount > 0
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400"}`}>
                  {selectedCount} selected
                </span>
              </div>
            </div>

            {/* Empty state */}
            {students.length === 0 ? (
              <div className="py-14 text-center">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  No active students in this section
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-12 px-5 py-3.5" />
                      <th className="px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide text-left">
                        Student
                      </th>
                      <th className="px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide text-left
                        hidden sm:table-cell">
                        Roll / Admission
                      </th>
                      <th className="px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide text-left">
                        Current Section
                      </th>
                      <th className="px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide text-left">
                        Moving To
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((student) => {
                      const isSelected = selectedIds.has(student.id);
                      return (
                        <tr
                          key={student.id}
                          onClick={() => toggleStudent(student.id)}
                          className={`cursor-pointer transition-colors
                            ${isSelected
                              ? "bg-blue-50/30 hover:bg-blue-50/50"
                              : "hover:bg-gray-50/50 opacity-50"}`}
                        >
                          {/* Checkbox */}
                          <td className="px-5 py-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(student.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded
                                border-gray-300 focus:ring-blue-500"
                            />
                          </td>

                          {/* Name + email */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-green-100 text-green-700
                                text-xs font-bold rounded-full flex items-center
                                justify-center shrink-0">
                                {student.name[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {student.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Roll / Admission */}
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            {student.rollNumber ? (
                              <span className="font-mono text-xs text-gray-600 bg-gray-100
                                px-2 py-0.5 rounded">
                                {student.rollNumber}
                              </span>
                            ) : student.admissionNo ? (
                              <span className="text-xs text-gray-500">
                                {student.admissionNo}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Current */}
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 text-xs font-medium
                              bg-gray-100 text-gray-600 rounded-full">
                              {student.sectionLabel}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="px-5 py-3.5">
                            {isSelected ? (
                              <span className={`px-2 py-0.5 text-xs font-semibold
                                rounded-full
                                ${graduate
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"}`}>
                                {graduate ? "🎓 Graduate" : targetLabel}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">
                                Not selected
                              </span>
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

          {/* Warning */}
          {graduate && deactivate && selectedCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border
              border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Accounts will be deactivated
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {selectedCount} student account
                  {selectedCount !== 1 ? "s" : ""} will be deactivated and
                  will not be able to log in. This action can be reversed
                  by reactivating each account individually.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border
              border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 font-medium">{saveError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm
                font-medium text-gray-600 bg-gray-100 hover:bg-gray-200
                rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handlePromote}
              disabled={!canPromote}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm
                font-bold rounded-lg transition-colors focus:outline-none
                focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed
                ${graduate
                  ? "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white focus:ring-purple-500"
                  : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white focus:ring-blue-500"}`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none"
                    viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  {graduate
                    ? <GraduationCap className="w-4 h-4" />
                    : <TrendingUp className="w-4 h-4" />}
                  {graduate
                    ? `Graduate ${selectedCount} Student${selectedCount !== 1 ? "s" : ""}`
                    : `Promote ${selectedCount} Student${selectedCount !== 1 ? "s" : ""}`}
                </>
              )}
            </button>

            {selectedCount === 0 && students.length > 0 && (
              <p className="text-xs text-amber-600">
                Select at least one student to continue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STEP 3 — DONE
         ═══════════════════════════════════════════════════════ */}
      {step === "done" && result && (
        <div className="space-y-5">

          {/* Result card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm
            overflow-hidden">
            <div className="px-6 py-8 text-center border-b border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Promotion complete!
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {sourceSectionLabel} →{" "}
                {graduate ? "Graduated" : targetLabel}
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {result.promoted > 0 && (
                <div className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <p className="text-3xl font-black text-blue-700">
                      {result.promoted}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase
                    tracking-wide">
                    Student{result.promoted !== 1 ? "s" : ""} Promoted
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    to {targetLabel}
                  </p>
                </div>
              )}
              {result.graduated > 0 && (
                <div className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    <p className="text-3xl font-black text-purple-700">
                      {result.graduated}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase
                    tracking-wide">
                    Student{result.graduated !== 1 ? "s" : ""} Graduated
                  </p>
                  {deactivate && (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      Accounts deactivated
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Next steps */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
              Suggested next steps
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              {result.promoted > 0 && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                    Update the timetable for the target section
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                    Assign new fee structures for the academic year
                  </li>
                </>
              )}
              {result.graduated > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                  Download report cards for graduated students before archiving
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                Review student lists to ensure all assignments are correct
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm
                font-semibold text-white bg-blue-600 hover:bg-blue-700
                rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Promote Another Class
            </button>

            
            <a  href="/school-admin/students"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm
                font-medium text-gray-600 bg-gray-100 hover:bg-gray-200
                rounded-lg transition-colors"
            >
              View Students
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
