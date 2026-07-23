"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }           from "next/navigation";
import { saveAttendance }      from "@/action/attendance.actions";
import {
  CalendarCheck, Users, CheckCircle2, AlertCircle,
} from "lucide-react";
import type { AttendanceStatusType } from "@/lib/validations/attendance";

// ── Types ─────────────────────────────────────────────────────────
export interface StudentRow {
  id:                    string;
  name:                  string;
  rollNumber:            string | null;
  admissionNo:           string | null;
  existingStatus:        string | null;
  existingRemarks:       string | null;
  existingAttendanceId:  string | null;
}

export interface SectionOption {
  id:    string;
  name:  string;
  class: { name: string };
}

interface Props {
  sections:          SectionOption[];
  students:          StudentRow[];
  selectedSectionId: string;
  selectedDate:      string;
  hasSelection:      boolean;
}

// ── Status config ─────────────────────────────────────────────────
const STATUSES: AttendanceStatusType[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
];

type StatusConfig = {
  label: string;
  short: string;
  base: string;
  active: string;
  pill: string;
};

const STATUS_CFG: Record<AttendanceStatusType, StatusConfig> = {
  PRESENT: {
    label: "Present",
    short: "P",
    base: "border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50",
    active: "border-green-500 bg-green-500 text-white shadow-sm",
    pill: "bg-green-50 text-green-700",
  },
  ABSENT: {
    label: "Absent",
    short: "A",
    base: "border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-700 hover:bg-red-50",
    active: "border-red-500 bg-red-500 text-white shadow-sm",
    pill: "bg-red-50 text-red-700",
  },
  LATE: {
    label: "Late",
    short: "L",
    base: "border-gray-200 text-gray-500 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50",
    active: "border-amber-500 bg-amber-500 text-white shadow-sm",
    pill: "bg-amber-50 text-amber-700",
  },
  HALF_DAY: {
    label: "Half Day",
    short: "H",
    base: "border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50",
    active: "border-blue-500 bg-blue-500 text-white shadow-sm",
    pill: "bg-blue-50 text-blue-700",
  },
};

// Row background when a non-PRESENT status is active
const ROW_BG: Record<AttendanceStatusType, string> = {
  PRESENT:  "border-gray-100 bg-white",
  ABSENT:   "border-red-200 bg-red-50/30",
  LATE:     "border-amber-200 bg-amber-50/20",
  HALF_DAY: "border-blue-200 bg-blue-50/20",
};

// ── Component ─────────────────────────────────────────────────────
export function AttendanceMarkingClient({
  sections,
  students,
  selectedSectionId,
  selectedDate,
  hasSelection,
}: Props) {
  const router                          = useRouter();
  const [isPending,    startTransition] = useTransition();
  const [isNavPending, startNav]        = useTransition();
  const today = new Date().toISOString().split("T")[0];

  // ── Local selection (before URL navigation) ───────────────────
  const [localSection, setLocalSection] = useState(selectedSectionId);
  const [localDate,    setLocalDate]    = useState(selectedDate || today);

  // ── Per-student attendance state ──────────────────────────────
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatusType>>(
    () => {
      const m: Record<string, AttendanceStatusType> = {};
      for (const s of students) {
        m[s.id] = (s.existingStatus as AttendanceStatusType) ?? "PRESENT";
      }
      return m;
    },
  );

  const [remarksMap, setRemarksMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const s of students) m[s.id] = s.existingRemarks ?? "";
    return m;
  });

  // ── UI feedback ───────────────────────────────────────────────
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isUpdate = students.some((s) => s.existingStatus !== null);

  // ── Live summary counts ───────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<AttendanceStatusType, number> = {
      PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0,
    };
    for (const st of Object.values(statusMap)) if (st) c[st]++;
    return c;
  }, [statusMap]);

  // ── Navigation helpers ────────────────────────────────────────
  const navigate = (sec: string, dt: string) => {
    if (!sec || !dt) return;
    setSaved(false);
    setSaveError(null);
    startNav(() => {
      router.push(`/teacher/attendance?sectionId=${sec}&date=${dt}`);
    });
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLocalSection(val);
    if (val && localDate) navigate(val, localDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalDate(val);
    if (localSection && val) navigate(localSection, val);
  };

  // ── Per-student setters ───────────────────────────────────────
  const setStatus = (id: string, status: AttendanceStatusType) => {
    setSaved(false);
    setStatusMap((p) => ({ ...p, [id]: status }));
  };

  const setRemarks = (id: string, val: string) => {
    setRemarksMap((p) => ({ ...p, [id]: val }));
  };

  // ── Mark all ─────────────────────────────────────────────────
  const markAll = (status: AttendanceStatusType) => {
    setSaved(false);
    const updated: Record<string, AttendanceStatusType> = {};
    for (const s of students) updated[s.id] = status;
    setStatusMap(updated);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!students.length || !selectedSectionId || !selectedDate) return;
    setSaved(false);
    setSaveError(null);

    const entries = students.map((s) => ({
      studentProfileId: s.id,
      status:           statusMap[s.id] ?? "PRESENT",
      remarks:          remarksMap[s.id]?.trim() || undefined,
    }));

    startTransition(async () => {
      const res = await saveAttendance({
        sectionId: selectedSectionId,
        date:      selectedDate,
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a section and date, then mark each student&apos;s status
        </p>
      </div>

      {/* ── Selection card ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Section select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Section
            </label>
            {sections.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  No sections assigned to you yet. Contact your school admin.
                </p>
              </div>
            ) : (
              <select
                value={localSection}
                onChange={handleSectionChange}
                disabled={isNavPending}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                  bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select a section —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={localDate}
              max={today}
              onChange={handleDateChange}
              disabled={isNavPending}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Navigation loading indicator */}
        {isNavPending && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading students…
          </div>
        )}
      </div>

      {/* ── Empty prompt ─────────────────────────────────────── */}
      {!hasSelection && !isNavPending && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No section or date selected
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select a section and date above to load the student list.
          </p>
        </div>
      )}

      {/* ── Attendance marking area ───────────────────────────── */}
      {hasSelection && !isNavPending && (
        <>
          {/* Update notice */}
          {isUpdate && (
            <div className="flex items-center gap-2.5 p-3.5 bg-blue-50
              border border-blue-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700">
                Attendance was already marked for this date. Saving will
                update existing records.
              </p>
            </div>
          )}

          {/* No students in section */}
          {students.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm
              py-14 text-center">
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
              {/* ── Summary + Mark-All toolbar ──────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3">

                {/* Live count pills */}
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <span
                      key={s}
                      className={`inline-flex items-center gap-1 px-3 py-1.5
                        text-xs font-semibold rounded-full ${STATUS_CFG[s].pill}`}
                    >
                      {STATUS_CFG[s].label}
                      <span className="font-bold">{counts[s]}</span>
                    </span>
                  ))}
                </div>

                {/* Quick mark-all */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Mark all:</span>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => markAll(s)}
                      className={`px-2.5 py-1 text-xs font-semibold border
                        rounded-md transition-colors ${STATUS_CFG[s].base}`}
                    >
                      {STATUS_CFG[s].short}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Student list ────────────────────────────── */}
              <div className="space-y-2">
                {students.map((student, idx) => {
                  const cur = statusMap[student.id] ?? "PRESENT";
                  return (
                    <div
                      key={student.id}
                      className={`rounded-xl border transition-colors ${ROW_BG[cur]}`}
                    >
                      <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">

                        {/* Index badge */}
                        <span className="w-7 h-7 flex items-center justify-center
                          text-xs font-bold text-gray-400 bg-gray-100 rounded-full shrink-0">
                          {idx + 1}
                        </span>

                        {/* Name + roll */}
                        <div className="flex-1 min-w-[120px]">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {student.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {student.rollNumber
                              ? `Roll: ${student.rollNumber}`
                              : student.admissionNo
                              ? `Adm: ${student.admissionNo}`
                              : "No roll no."}
                          </p>
                        </div>

                        {/* Status button group */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStatus(student.id, status)}
                              className={`px-2.5 py-1.5 text-xs font-semibold border
                                rounded-lg transition-all duration-150 focus:outline-none
                                focus:ring-2 focus:ring-offset-1
                                ${cur === status
                                  ? STATUS_CFG[status].active
                                  : STATUS_CFG[status].base}`}
                            >
                              <span className="hidden sm:inline">
                                {STATUS_CFG[status].label}
                              </span>
                              <span className="sm:hidden">
                                {STATUS_CFG[status].short}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Remarks row */}
                      <div className="px-4 pb-3">
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. medical leave, informed in advance)…"
                          value={remarksMap[student.id] ?? ""}
                          onChange={(e) => setRemarks(student.id, e.target.value)}
                          maxLength={200}
                          className="w-full text-xs border border-gray-200 rounded-lg
                            px-3 py-1.5 bg-white/70 placeholder-gray-300
                            focus:outline-none focus:ring-1 focus:ring-blue-400
                            focus:border-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Success / Error banners ─────────────────── */}
              {saved && (
                <div className="flex items-start gap-3 p-4 bg-green-50
                  border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Attendance saved!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {students.length} student{students.length !== 1 ? "s" : ""} marked
                      for {selectedDate}.
                    </p>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="flex items-start gap-3 p-4 bg-red-50
                  border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{saveError}</p>
                </div>
              )}

              {/* ── Footer: info + save button ──────────────── */}
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-gray-400">
                  {students.length} student{students.length !== 1 ? "s" : ""}
                  {" · "}
                  {selectedDate}
                  {isUpdate && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600
                      text-xs font-medium rounded">
                      Updating
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || students.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600
                    hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                    text-white text-sm font-semibold rounded-lg transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {isUpdate ? "Update Attendance" : "Save Attendance"}
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
