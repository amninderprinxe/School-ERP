import { requireRole }      from "@/lib/session";
import { prisma }           from "@/lib/db";
import {
  ExamResultCard,
  type ExamResultGroup,
  type SubjectResult,
}                           from "@/components/results/exam-result-card";
import { calcPercentage }   from "@/lib/results-utils";
import {
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Award,
}                           from "lucide-react";
import type { ExamType }    from "@prisma/client";

export const metadata = { title: "My Results" };

export default async function StudentResultsPage() {
  const user     = await requireRole(["STUDENT"]);
  const schoolId = user.schoolId!;

  // ── Student profile ───────────────────────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      section: { include: { class: true } },
    },
  });

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Student profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  // ── All results for this student ──────────────────────────────
  const rawResults = await prisma.result.findMany({
    where: {
      studentProfileId: studentProfile.id,
      schoolId,
    },
    include: {
      exam:    { include: { class: true } },
      subject: true,
    },
    orderBy: [
      { exam: { startDate: "desc" } },
      { exam: { createdAt: "desc" } },
      { subject: { name: "asc" } },
    ],
  });

  // ── Group by exam ─────────────────────────────────────────────
  const examMap = new Map<string, ExamResultGroup>();

  for (const r of rawResults) {
    if (!examMap.has(r.examId)) {
      examMap.set(r.examId, {
        examId:    r.examId,
        examName:  r.exam.name,
        examType:  r.exam.examType as ExamType,
        className: r.exam.class.name,
        startDate: r.exam.startDate,
        endDate:   r.exam.endDate,
        results:   [],
      });
    }
    (examMap.get(r.examId)!.results as SubjectResult[]).push({
      id:            r.id,
      subjectName:   r.subject.name,
      subjectCode:   r.subject.code,
      marksObtained: r.marksObtained,
      maxMarks:      r.maxMarks,
      grade:         r.grade,
      remarks:       r.remarks,
    });
  }

  const groups = Array.from(examMap.values());

  // ── Overall summary stats ─────────────────────────────────────
  const allResults  = rawResults;
  const totalObtained = allResults.reduce((s, r) => s + r.marksObtained, 0);
  const totalMax      = allResults.reduce((s, r) => s + r.maxMarks, 0);
  const overallPct    = calcPercentage(totalObtained, totalMax);
  const examCount     = groups.length;
  const subjectCount  = allResults.length;

  // Best exam by percentage
  const bestExam = groups.reduce<{ name: string; pct: number } | null>(
    (best, g) => {
      const got = g.results.reduce((s, r) => s + r.marksObtained, 0);
      const max = g.results.reduce((s, r) => s + r.maxMarks, 0);
      const pct = calcPercentage(got, max);
      if (!best || pct > best.pct) return { name: g.examName, pct };
      return best;
    },
    null,
  );

  const sectionLabel = studentProfile.section
    ? `${studentProfile.section.class.name} — Section ${studentProfile.section.name}`
    : "No section assigned";

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
      </div>

      {/* ── Overall summary ───────────────────────────────────── */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Exams Taken",
              value: examCount,
              icon:  ClipboardCheck,
              color: "text-indigo-700",
              bg:    "bg-indigo-50",
            },
            {
              label: "Subjects",
              value: subjectCount,
              icon:  BookOpen,
              color: "text-blue-700",
              bg:    "bg-blue-50",
            },
            {
              label: "Overall %",
              value: `${overallPct}%`,
              icon:  TrendingUp,
              color: overallPct >= 75
                ? "text-emerald-700"
                : overallPct >= 40
                ? "text-amber-700"
                : "text-red-700",
              bg: overallPct >= 75
                ? "bg-emerald-50"
                : overallPct >= 40
                ? "bg-amber-50"
                : "bg-red-50",
            },
            {
              label: "Best Exam",
              value: bestExam ? `${bestExam.pct}%` : "—",
              icon:  Award,
              color: "text-purple-700",
              bg:    "bg-purple-50",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm
                p-4 flex items-start gap-3"
            >
              <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center
                justify-center shrink-0 mt-0.5`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-xs font-medium text-gray-400 mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Exam cards ────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No results yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Results will appear here once your teachers have entered marks.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <ExamResultCard key={group.examId} group={group} />
          ))}
        </div>
      )}

    </div>
  );
}