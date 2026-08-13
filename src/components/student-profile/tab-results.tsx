"use client";

import { useMemo }      from "react";
import { motion }       from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend,
}                       from "recharts";
import { cn }           from "@/lib/utils";
import { Award, TrendingUp, TrendingDown } from "lucide-react";
import type { StudentProfileData } from "./types";

const EXAM_TYPE_LABELS: Record<string, string> = {
  UNIT_TEST: "Unit Test", MID_TERM: "Mid Term",
  FINAL: "Final", ASSIGNMENT: "Assignment",
  PRACTICAL: "Practical", OTHER: "Other",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "A":  "text-emerald-700 bg-emerald-50 border-emerald-200",
  "B+": "text-blue-700 bg-blue-50 border-blue-200",
  "B":  "text-blue-700 bg-blue-50 border-blue-200",
  "C":  "text-amber-700 bg-amber-50 border-amber-200",
  "D":  "text-orange-700 bg-orange-50 border-orange-200",
  "F":  "text-red-700 bg-red-50 border-red-200",
};

function gradeColor(grade: string | null): string {
  return GRADE_COLORS[grade ?? ""] ?? "text-gray-700 bg-gray-50 border-gray-200";
}

function pctColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function TabResults({ data }: { data: StudentProfileData }) {
  const { results } = data;

  // ── Group by exam ─────────────────────────────────────────────
  const examGroups = useMemo(() => {
    const map = new Map<string, {
      exam: (typeof results)[0]["exam"];
      items: typeof results;
    }>();
    for (const r of results) {
      const key = r.exam.id;
      const cur = map.get(key) ?? { exam: r.exam, items: [] };
      cur.items.push(r);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.exam.startDate && b.exam.startDate) {
        return b.exam.startDate.localeCompare(a.exam.startDate);
      }
      return 0;
    });
  }, [results]);

  // ── Subject averages for radar ────────────────────────────────
  const radarData = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of results) {
      const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
      const cur = map.get(r.subject.name) ?? { sum: 0, count: 0 };
      map.set(r.subject.name, { sum: cur.sum + pct, count: cur.count + 1 });
    }
    return Array.from(map.entries())
      .map(([subject, v]) => ({
        subject: subject.length > 10 ? subject.slice(0, 10) + "…" : subject,
        avg:     Math.round(v.sum / v.count),
      }))
      .slice(0, 8);
  }, [results]);

  // ── Overall stats ─────────────────────────────────────────────
  const overallAvg = results.length > 0
    ? Math.round(results.reduce((s, r) =>
        s + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0
      ) / results.length)
    : null;
  const passCount = results.filter(
    (r) => r.maxMarks > 0 && (r.marksObtained / r.maxMarks) * 100 >= 40,
  ).length;
  const passRate = results.length > 0
    ? Math.round((passCount / results.length) * 100)
    : null;

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" aria-hidden />
        <p className="text-sm font-medium text-gray-500">No results recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Overall Average",
            value: overallAvg !== null ? `${overallAvg}%` : "—",
            color: overallAvg !== null
              ? (overallAvg >= 75 ? "text-emerald-700 bg-emerald-50" : overallAvg >= 50 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50")
              : "text-gray-700 bg-gray-50",
          },
          {
            label: "Pass Rate",
            value: passRate !== null ? `${passRate}%` : "—",
            color: passRate !== null
              ? (passRate >= 80 ? "text-emerald-700 bg-emerald-50" : passRate >= 60 ? "text-blue-700 bg-blue-50" : "text-red-700 bg-red-50")
              : "text-gray-700 bg-gray-50",
          },
          {
            label: "Exams Taken",
            value: String(examGroups.length),
            color: "text-purple-700 bg-purple-50",
          },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl p-4 border border-transparent", s.color)}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
            <p className="text-3xl font-extrabold mt-1 leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Radar chart ───────────────────────────────────── */}
      {radarData.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100
            shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-[14px] font-bold text-gray-900">Subject Performance</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Average score per subject</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2">
                        <p className="font-semibold">{payload[0]?.payload?.subject}</p>
                        <p>{payload[0]?.value}%</p>
                      </div>
                    );
                  }}
                />
                <Radar
                  name="Average"
                  dataKey="avg"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Per-exam groups ───────────────────────────────── */}
      <div className="space-y-4">
        {examGroups.map((group, gi) => {
          const examTotal    = group.items.reduce((s, r) => s + r.marksObtained, 0);
          const examMax      = group.items.reduce((s, r) => s + r.maxMarks,      0);
          const examPct      = examMax > 0 ? Math.round((examTotal / examMax) * 100) : 0;
          const examPassed   = group.items.every(
            (r) => r.maxMarks > 0 && (r.marksObtained / r.maxMarks) * 100 >= 40,
          );

          return (
            <motion.div
              key={group.exam.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: gi * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100
                shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              {/* Exam header */}
              <div className="flex items-center justify-between px-5 py-4
                bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">
                    {group.exam.name}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{EXAM_TYPE_LABELS[group.exam.examType] ?? group.exam.examType}</span>
                    {group.exam.startDate && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>
                          {new Date(group.exam.startDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-2xl font-extrabold leading-none",
                    examPct >= 75 ? "text-emerald-700" : examPct >= 50 ? "text-amber-700" : "text-red-600",
                  )}>
                    {examPct}%
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {examTotal}/{examMax} marks
                  </p>
                </div>
              </div>

              {/* Subject rows */}
              <div className="divide-y divide-gray-50">
                {group.items.map((r) => {
                  const pct = r.maxMarks > 0
                    ? Math.round((r.marksObtained / r.maxMarks) * 100)
                    : 0;
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3.5
                      hover:bg-gray-50/50 transition-colors">
                      {/* Grade badge */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          "text-sm font-black shrink-0 border",
                          gradeColor(r.grade),
                        )}
                      >
                        {r.grade ?? pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" :
                          pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F"}
                      </div>

                      {/* Subject + progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">
                            {r.subject.name}
                            {r.subject.code && (
                              <span className="ml-1.5 text-[11px] font-mono text-gray-400">
                                ({r.subject.code})
                              </span>
                            )}
                          </p>
                          <p className="text-[12px] font-bold text-gray-700 shrink-0 ml-2">
                            {r.marksObtained}/{r.maxMarks}
                          </p>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + gi * 0.07, duration: 0.6, ease: "easeOut" }}
                            className={cn("h-full rounded-full", pctColor(pct))}
                          />
                        </div>
                      </div>

                      {/* Pct */}
                      <div
                        className={cn(
                          "shrink-0 text-[13px] font-bold w-12 text-right",
                          pct >= 75 ? "text-emerald-700" : pct >= 50 ? "text-amber-700" : "text-red-600",
                        )}
                      >
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}