"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
}                              from "recharts";
import {
  ChartShell, ChartTooltip, StatBadge, ChartSkeleton,
}                              from "./chart-shell";
import { AnyComponent } from "@fullcalendar/core/preact.js";

interface SubjectData  { subject: string; avg: number; highest: number; passRate: number; count: number }
interface ExamData     { exam: string; class: string; avg: number; passRate: number; count: number }
interface GradeData    { grade: string; count: number; pct: number }
interface AcadData {
  subjects:    SubjectData[];
  examResults: ExamData[];
  gradesDist:  GradeData[];
  summary:     {
    totalResults: number; overallAvg: number;
    overallPass: number; subjectCount: number; examCount: number;
  };
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "#059669",
  "A":  "#10b981",
  "B+": "#3b82f6",
  "B":  "#6366f1",
  "C":  "#f59e0b",
  "D":  "#f97316",
  "F":  "#ef4444",
};

const SUBJECT_COLORS = [
  "#6366f1","#8b5cf6","#3b82f6","#10b981",
  "#f59e0b","#ef4444","#ec4899","#06b6d4",
];

export function AcademicsCharts() {
  const [data,    setData]    = useState<AcadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/academics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load academics data."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <ChartSkeleton height={280} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-red-600 font-medium">{error ?? "No data"}</p>
      </div>
    );
  }

  const { summary, subjects, examResults, gradesDist } = data;

  // Radar data: top subjects by avg
  const radarData = subjects.slice(0, 8).map(s => ({
    subject:  s.subject.length > 8 ? s.subject.slice(0, 8) + "…" : s.subject,
    avg:      s.avg,
    passRate: s.passRate,
  }));

  return (
    <div className="space-y-5">

      {/* ── Summary ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="Overall Average"
          value={`${summary.overallAvg}%`}
          sub="across all exams"
          color={summary.overallAvg >= 70 ? "green" : summary.overallAvg >= 50 ? "amber" : "red"}
        />
        <StatBadge
          label="Pass Rate"
          value={`${summary.overallPass}%`}
          sub="students ≥ 40%"
          color={summary.overallPass >= 80 ? "green" : summary.overallPass >= 60 ? "amber" : "red"}
        />
        <StatBadge
          label="Subjects"
          value={summary.subjectCount}
          sub="with results"
          color="blue"
        />
        <StatBadge
          label="Exams Analysed"
          value={summary.examCount}
          sub={`${summary.totalResults} results total`}
          color="purple"
        />
      </div>

      {/* ── Subject performance bar ───────────────────────── */}
      <ChartShell
        title="Subject Performance"
        subtitle="Average marks and pass rate per subject"
        csvData={subjects as unknown as Record<string, unknown>[]}
        csvName="subject-performance"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={subjects}
            margin={{ top: 5, right: 10, bottom: 0, left: -12 }}
            barSize={14}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "#374151" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.length > 8 ? v.slice(0, 8) + "…" : v}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}%`}
              width={36}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props as any}
                  formatter={(v, key) =>
                    key === "count"
                      ? `${v} students`
                      : `${v}%`
                  }
                />
              )}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Bar
              dataKey="avg"
              name="Average %"
              radius={[4, 4, 0, 0]}
              animationDuration={700}
            >
              {subjects.map((_, i) => (
                <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
              ))}
            </Bar>
            <Bar
              dataKey="passRate"
              name="Pass Rate %"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* ── Row: Radar + Grade distribution ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Radar */}
        <ChartShell
          title="Subject Radar"
          subtitle="Average marks across subjects"
          csvData={radarData}
          csvName="subject-radar"
          minHeight={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={95}>
              <PolarGrid stroke="#f3f4f6" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: "#6b7280" }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickCount={5}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    {...props as any}
                    formatter={v => `${v}%`}
                  />
                )}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Radar
                name="Avg %"
                dataKey="avg"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Pass Rate %"
                dataKey="passRate"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* Grade distribution */}
        <ChartShell
          title="Grade Distribution"
          subtitle="Number of results per grade"
          csvData={gradesDist as unknown as Record<string, unknown>[]}
          csvName="grade-distribution"
          minHeight={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={gradesDist}
              margin={{ top: 5, right: 10, bottom: 0, left: -12 }}
              barSize={36}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 13, fill: "#374151", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    {...props as any}
                    formatter={(v, key) =>
                      key === "pct" ? `${v}%` : `${v} results`
                    }
                  />
                )}
              />
              <Bar
                dataKey="count"
                name="Results"
                radius={[6, 6, 0, 0]}
                animationDuration={700}
              >
                {gradesDist.map((g) => (
                  <Cell key={g.grade} fill={GRADE_COLORS[g.grade] ?? "#94a3b8"} />
                ))}
                <LabelList
                  dataKey="pct"
                  position="top"
                  formatter={(v: any) => v > 0 ? `${v}%` : ""}
                  style={{ fontSize: "11px", fontWeight: 600, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* ── Exam pass rates ───────────────────────────────── */}
      {examResults.length > 0 && (
        <ChartShell
          title="Exam Pass Rates"
          subtitle="Pass percentage per exam"
          csvData={examResults as unknown as Record<string, unknown>[]}
          csvName="exam-pass-rates"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={examResults}
              layout="vertical"
              margin={{ top: 5, right: 48, bottom: 0, left: 0 }}
              barSize={12}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="exam"
                tick={{ fontSize: 11, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={v => v.length > 16 ? v.slice(0, 16) + "…" : v}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    {...props as any}
                    formatter={(v, key) =>
                      key === "avg" ? `${v}%` : key === "passRate" ? `${v}%` : `${v}`
                    }
                  />
                )}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Bar
                dataKey="passRate"
                name="Pass Rate %"
                fill="#10b981"
                radius={[0, 5, 5, 0]}
                animationDuration={700}
              >
                <LabelList
                  dataKey="passRate"
                  position="right"
                  style={{ fontSize: "11px", fontWeight: 600, fill: "#059669" }}
                  formatter={(v: any) => `${v}%`}
                />
              </Bar>
              <Bar
                dataKey="avg"
                name="Average %"
                fill="#6366f1"
                radius={[0, 5, 5, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
    </div>
  );
}