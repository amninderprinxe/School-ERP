"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import type { ActionResult } from "@/types/actions";

// ── Prop types ────────────────────────────────────────────────────
interface SectionOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections?: SectionOption[];
}

interface TeacherOption {
  id: string; // teacherProfile.id — NOT user.id
  name: string;
  employeeCode: string | null;
}

interface SubjectInitialData {
  name: string;
  code: string | null;
  classId: string;
  assignedTeacherProfileIds: string[];
  assignedSectionIds?: string[];
}

interface SubjectFormProps {
  classes: ClassOption[];
  teachers: TeacherOption[];
  action: (formData: FormData) => Promise<ActionResult>;
  initialData?: SubjectInitialData;
  mode: "create" | "edit";
}

// ── Shared style tokens ───────────────────────────────────────────
const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "disabled:bg-gray-50 disabled:text-gray-400";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

// ─────────────────────────────────────────────────────────────────
export function SubjectForm({
  classes,
  teachers,
  action,
  initialData,
  mode,
}: SubjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[] | undefined>>({});

  // 1. State for selected class
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialData?.classId || (classes[0]?.id ?? "")
  );

  // 2. Derive available sections for the current class
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = currentClass?.sections || [];

  // 3. State for selected sections
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    initialData?.assignedSectionIds && initialData.assignedSectionIds.length > 0
      ? initialData.assignedSectionIds
      : availableSections.map((s) => s.id)
  );

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const targetClass = classes.find((c) => c.id === newClassId);
    const secIds = (targetClass?.sections || []).map((s) => s.id);
    setSelectedSectionIds(secIds);
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setSelectedSectionIds(availableSections.map((s) => s.id));
  };

  const deselectAllSections = () => {
    setSelectedSectionIds([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});

    if (availableSections.length > 0 && selectedSectionIds.length === 0) {
      setFormError("Please select at least one section for this subject.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Overwrite classId and sectionIds cleanly
    fd.set("classId", selectedClassId);
    fd.delete("sectionIds");
    selectedSectionIds.forEach((secId) => {
      fd.append("sectionIds", secId);
    });

    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/subjects");
        router.refresh();
      } else {
        setFormError(res.error ?? null);
        if (!res.success && res.fieldErrors) {
          setFe(res.fieldErrors);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Global error banner ───────────────────────────── */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Name + Code (side by side on md+) ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Name */}
          <div>
            <label className={LABEL}>
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialData?.name ?? ""}
              placeholder="e.g. Mathematics, Physics, Hindi"
              className={INPUT}
            />
            {fe.name && (
              <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>
            )}
          </div>

          {/* Code */}
          <div>
            <label className={LABEL}>
              Subject Code{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            <input
              type="text"
              name="code"
              defaultValue={initialData?.code ?? ""}
              placeholder="e.g. MATH-10, HIN-07"
              className={INPUT}
            />
            {fe.code && (
              <p className="text-xs text-red-500 mt-1">{fe.code[0]}</p>
            )}
          </div>
        </div>

        {/* ── Class select ──────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Class <span className="text-red-500">*</span>
          </label>

          {classes.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                No classes found.{" "}
                <Link
                  href="/school-admin/classes/new"
                  className="underline font-semibold"
                >
                  Create a class first
                </Link>{" "}
                before adding subjects.
              </p>
            </div>
          ) : (
            <>
              <select
                name="classId"
                required
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className={`${INPUT} bg-white`}
              >
                <option value="">— Select a class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fe.classId && (
                <p className="text-xs text-red-500 mt-1">{fe.classId[0]}</p>
              )}
            </>
          )}
        </div>

        {/* ── Section Selection Badges ───────────────────── */}
        {selectedClassId && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Select Applicable Sections <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">
                  Select which sections study this subject:
                </span>
              </div>
              {availableSections.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllSections}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllSections}
                    className="text-gray-500 hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {availableSections.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                No sections exist for this class. Go to Sections menu to create one first.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableSections.map((sec) => {
                  const isSelected = selectedSectionIds.includes(sec.id);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span>Section {sec.name}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Teacher checkboxes ────────────────────────── */}
        <div>
          <label className={LABEL}>
            Assign Teachers{" "}
            <span className="text-xs font-normal text-gray-400">
              (optional — select one or more)
            </span>
          </label>

          {teachers.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                No teachers found.{" "}
                <Link
                  href="/school-admin/teachers/new"
                  className="underline font-semibold"
                >
                  Add teachers first
                </Link>{" "}
                to assign them to subjects.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto bg-white">
              {teachers.map((t) => {
                const isChecked =
                  initialData?.assignedTeacherProfileIds.includes(t.id) ??
                  false;

                return (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors select-none"
                  >
                    <input
                      type="checkbox"
                      name="teacherIds"
                      value={t.id}
                      defaultChecked={isChecked}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.name}
                      </p>
                      {t.employeeCode && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.employeeCode}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer actions ────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "create" ? "Add Subject" : "Update Subject"}
        </button>

        <Link
          href="/school-admin/subjects"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}