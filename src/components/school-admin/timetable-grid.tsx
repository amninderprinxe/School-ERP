"use client";

import {
  useState,
  useTransition,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useRouter }    from "next/navigation";
import {
  upsertPeriod,
  deletePeriod,
}                       from "@/action/timetable.actions";
import {
  DAYS_OF_WEEK,
  DAY_SHORT,
  DAY_LABEL,
  MAX_PERIODS,
  type DayOfWeekType,
}                       from "@/lib/validations/timetable";
import {
  CheckCircle2, AlertCircle, X, Plus, Clock, Trash2,
  CalendarDays,
}                       from "lucide-react";

export interface PeriodData {
  id:               string;
  dayOfWeek:        DayOfWeekType;
  periodNumber:     number;
  startTime:        string | null;
  endTime:          string | null;
  subjectId:        string | null;
  subjectName:      string | null;
  subjectCode:      string | null;
  teacherProfileId: string | null;
  teacherName:      string | null;
}

export interface SubjectOption { id: string; name: string; code: string | null }
export interface TeacherOption { id: string; name: string; employeeCode: string | null }

interface Props {
  sectionId:       string;
  sectionLabel:    string;
  periods:         PeriodData[];
  subjects:        SubjectOption[];
  teachers:        TeacherOption[];
  currentYearName: string | null;   // ← NEW
}

const COLORS = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-red-100 border-red-300 text-red-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
];

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "focus:border-transparent bg-white disabled:bg-gray-50";

interface CellKey  { day: DayOfWeekType; period: number }
interface FormState {
  subjectId: string; teacherProfileId: string;
  startTime: string; endTime: string;
}

export function TimetableGrid({
  sectionId,
  sectionLabel,
  periods,
  subjects,
  teachers,
  currentYearName,
}: Props) {
  const router = useRouter();
  const [showSat, setShowSat] = useState(false);
  const activeDays = showSat ? DAYS_OF_WEEK : DAYS_OF_WEEK.slice(0, 5);

  const [selected,   setSelected]   = useState<CellKey | null>(null);
  const [form,       setForm]       = useState<FormState>({
    subjectId: "", teacherProfileId: "", startTime: "", endTime: "",
  });
  const editRef = useRef<HTMLDivElement>(null);

  const [isPendingSave,   startSave]   = useTransition();
  const [isPendingDelete, startDelete] = useTransition();
  const [feedback,        setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const periodMap = useMemo(() => {
    const m = new Map<string, PeriodData>();
    for (const p of periods) m.set(`${p.dayOfWeek}-${p.periodNumber}`, p);
    return m;
  }, [periods]);

  const subjectColorMap = useMemo(() => {
    const m = new Map<string, string>();
    subjects.forEach((s, i) => m.set(s.id, COLORS[i % COLORS.length]!));
    return m;
  }, [subjects]);

  const selectCell = (day: DayOfWeekType, period: number) => {
    const existing = periodMap.get(`${day}-${period}`);
    setSelected({ day, period });
    setForm({
      subjectId:        existing?.subjectId        ?? "",
      teacherProfileId: existing?.teacherProfileId ?? "",
      startTime:        existing?.startTime        ?? "",
      endTime:          existing?.endTime          ?? "",
    });
    setFeedback(null);
  };

  useEffect(() => {
    if (selected && editRef.current) {
      editRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected?.day, selected?.period]);

  const handleSave = () => {
    if (!selected) return;
    setFeedback(null);
    startSave(async () => {
      const res = await upsertPeriod({
        sectionId,
        dayOfWeek:        selected.day,
        periodNumber:     selected.period,
        subjectId:        form.subjectId        || undefined,
        teacherProfileId: form.teacherProfileId || undefined,
        startTime:        form.startTime        || undefined,
        endTime:          form.endTime          || undefined,
      });
      if (res.success) {
        setFeedback({ type: "success", msg: "Period saved!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: res.error });
      }
    });
  };

  const handleClear = () => {
    if (!selected) return;
    const existing = periodMap.get(`${selected.day}-${selected.period}`);
    if (!existing) { setSelected(null); return; }
    setFeedback(null);
    startDelete(async () => {
      const res = await deletePeriod(existing.id);
      if (res.success) {
        setFeedback({ type: "success", msg: "Period cleared." });
        router.refresh();
        setSelected(null);
      } else {
        setFeedback({ type: "error", msg: res.error });
      }
    });
  };

  const isLoading = isPendingSave || isPendingDelete;

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{sectionLabel}</span>
          {currentYearName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5
              text-xs font-semibold bg-indigo-50 text-indigo-700
              border border-indigo-200 rounded-full">
              <CalendarDays className="w-3 h-3" />
              {currentYearName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowSat((p) => !p)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
            font-semibold rounded-lg border transition-colors
            ${showSat
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
        >
          {showSat ? "Hide Saturday" : "Show Saturday"}
        </button>
      </div>

      {/* No year warning */}
      {!currentYearName && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">No current academic year set.</span>{" "}
            Periods saved here will not be year-scoped. Set an academic year
            to enable year-based timetables.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-16 px-3 py-3.5 bg-gray-50 border-b border-r
                  border-gray-100 text-xs font-semibold text-gray-400 uppercase
                  tracking-wide text-center sticky left-0 z-10">
                  P#
                </th>
                {activeDays.map((day) => (
                  <th key={day}
                    className="min-w-[140px] px-3 py-3.5 bg-gray-50 border-b
                      border-r last:border-r-0 border-gray-100 text-xs font-semibold
                      text-gray-700 uppercase tracking-wide text-center">
                    <span className="hidden sm:block">{DAY_LABEL[day]}</span>
                    <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((periodNum) => (
                <tr key={periodNum}>
                  <td className="px-3 py-2.5 bg-gray-50 border-b last:border-b-0
                    border-r border-gray-100 text-center sticky left-0 z-10">
                    <span className="text-xs font-bold text-gray-500">
                      P{periodNum}
                    </span>
                  </td>
                  {activeDays.map((day) => {
                    const key       = `${day}-${periodNum}`;
                    const period    = periodMap.get(key);
                    const isSelected =
                      selected?.day === day && selected?.period === periodNum;
                    const color = period?.subjectId
                      ? (subjectColorMap.get(period.subjectId) ??
                        "bg-gray-100 border-gray-300 text-gray-800")
                      : null;

                    return (
                      <td key={day}
                        className="p-1.5 border-b last:border-b-0 border-r
                          last:border-r-0 border-gray-100">
                        <button
                          type="button"
                          onClick={() => selectCell(day, periodNum)}
                          className={[
                            "w-full min-h-[68px] rounded-lg border-2 p-2",
                            "transition-all duration-150 text-left focus:outline-none",
                            "focus:ring-2 focus:ring-blue-400",
                            isSelected ? "ring-2 ring-blue-500 ring-offset-1 scale-[0.98]" : "",
                            period?.subjectId && color
                              ? `${color} hover:brightness-95`
                              : "border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40",
                          ].join(" ")}
                        >
                          {period?.subjectId ? (
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs font-bold leading-tight line-clamp-1">
                                {period.subjectName}
                              </p>
                              {period.subjectCode && (
                                <p className="text-[10px] font-mono opacity-70 leading-none">
                                  {period.subjectCode}
                                </p>
                              )}
                              {period.teacherName && (
                                <p className="text-[10px] opacity-75 leading-tight mt-0.5 line-clamp-1">
                                  {period.teacherName}
                                </p>
                              )}
                              {(period.startTime || period.endTime) && (
                                <p className="text-[10px] opacity-60 flex items-center gap-0.5 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {period.startTime}
                                  {period.startTime && period.endTime ? "–" : ""}
                                  {period.endTime}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full min-h-[52px]">
                              <Plus className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit panel */}
      {selected && (
        <div ref={editRef}
          className="bg-white rounded-xl border border-blue-200 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5
            bg-blue-50 border-b border-blue-100">
            <div>
              <p className="text-sm font-bold text-blue-900">
                Edit Period {selected.period} — {DAY_LABEL[selected.day]}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {sectionLabel}
                {currentYearName && ` · ${currentYearName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setSelected(null); setFeedback(null); }}
              className="p-1.5 text-blue-400 hover:text-blue-700 hover:bg-blue-100
                rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-500
                  uppercase tracking-wide mb-1.5">
                  Subject
                </label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                  disabled={isLoading}
                  className={INPUT}
                >
                  <option value="">— No subject —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-xs font-semibold text-gray-500
                  uppercase tracking-wide mb-1.5">
                  Teacher
                </label>
                <select
                  value={form.teacherProfileId}
                  onChange={(e) => setForm((p) => ({ ...p, teacherProfileId: e.target.value }))}
                  disabled={isLoading}
                  className={INPUT}
                >
                  <option value="">— No teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.employeeCode ? ` (${t.employeeCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500
                  uppercase tracking-wide mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  disabled={isLoading}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500
                  uppercase tracking-wide mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  disabled={isLoading}
                  className={INPUT}
                />
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`flex items-center gap-2.5 p-3 rounded-lg text-sm
                font-medium ${feedback.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"}`}>
                {feedback.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {feedback.msg}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5
                  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                  text-white text-sm font-semibold rounded-lg transition-colors">
                {isPendingSave ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Period
                  </>
                )}
              </button>

              {periodMap.has(`${selected.day}-${selected.period}`) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5
                    bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600
                    text-sm font-semibold rounded-lg transition-colors">
                  {isPendingDelete ? "Clearing…" : (
                    <><Trash2 className="w-4 h-4" />Clear Period</>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => { setSelected(null); setFeedback(null); }}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600
                  bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
