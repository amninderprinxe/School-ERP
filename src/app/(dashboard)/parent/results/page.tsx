import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  ExamResultCard,
  type ExamResultGroup,
  type SubjectResult,
} from "@/components/results/exam-result-card";
import {
  ChildSelector,
  type ChildOption,
} from "@/components/results/child-selector";
import { calcPercentage } from "@/lib/results-utils";
import {
  Baby,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Award,
} from "lucide-react";
import type { ExamType } from "@prisma/client";

export const metadata = { title: "Children's Results" };

interface Props {
  searchParams: Promise<{ childId?: string }>;
}

export default async function ParentResultsPage({ searchParams }: Props) {
  const user = await requireRole(["PARENT"]);
  const schoolId = user.schoolId!;
  const sp = await searchParams;

  // ── Parent profile + linked children ─────────────────────────
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user: { select: { name: true, isActive: true } },
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">
            Parent profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin.
          </p>
        </div>
      </div>
    );
  }

  const linkedChildren = parentProfile.children;

  if (linkedChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Children&apos;s Results
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View your children&apos;s exam results
          </p>
        </div>
        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center"
        >
          <Baby className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No children linked
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to link your children to your account.
          </p>
        </div>
      </div>
    );
  }

  // ── Resolve selected child (security: must belong to this parent) ─
  const validIds = new Set(linkedChildren.map((c) => c.studentProfileId));
  const selectedId =
    sp.childId && validIds.has(sp.childId)
      ? sp.childId
      : linkedChildren[0]!.studentProfileId;

  const selectedLink = linkedChildren.find(
    (c) => c.studentProfileId === selectedId,
  )!;
  const selectedChild = selectedLink.studentProfile;
  const selectedChildUser = selectedChild.user;

  // ── ChildOption list for selector ────────────────────────────
  const childOptions: ChildOption[] = linkedChildren.map((c) => ({
    studentProfileId: c.studentProfileId,
    name: c.studentProfile.user.name,
    relation: c.relation,
  }));

  // ── Verify selected child's school matches parent's school ────
  const childUser = await prisma.user.findUnique({
    where: { id: selectedChild.userId },
    select: { schoolId: true },
  });
  if (!childUser || childUser.schoolId !== schoolId) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-red-500">Access denied.</p>
      </div>
    );
  }

  // ── Results for selected child ────────────────────────────────
  const rawResults = await prisma.result.findMany({
    where: {
      studentProfileId: selectedId,
      schoolId,
    },
    include: {
      exam: { include: { class: true } },
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
        examId: r.examId,
        examName: r.exam.name,
        examType: r.exam.examType as ExamType,
        className: r.exam.class.name,
        startDate: r.exam.startDate,
        endDate: r.exam.endDate,
        results: [],
      });
    }
    (examMap.get(r.examId)!.results as SubjectResult[]).push({
      id: r.id,
      subjectName: r.subject.name,
      subjectCode: r.subject.code,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      grade: r.grade,
      remarks: r.remarks,
    });
  }

  const groups = Array.from(examMap.values());

  // ── Summary stats for selected child ─────────────────────────
  const totalObtained = rawResults.reduce((s, r) => s + r.marksObtained, 0);
  const totalMax = rawResults.reduce((s, r) => s + r.maxMarks, 0);
  const overallPct = calcPercentage(totalObtained, totalMax);
  const examCount = groups.length;
  const subjectCount = rawResults.length;

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

  const sectionLabel = selectedChild.section
    ? `${selectedChild.section.class.name} — Section ${selectedChild.section.name}`
    : "No section assigned";

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Children&apos;s Results
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View your children&apos;s exam performance
        </p>
      </div>

      {/* ── Child selector (hidden if only 1 child) ───────────── */}
      {linkedChildren.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <ChildSelector children={childOptions} selectedId={selectedId} />
        </div>
      )}

      {/* ── Selected child info card ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 bg-gradient-to-br from-green-400
            to-teal-500 rounded-full flex items-center justify-center
            text-white text-xl font-bold shrink-0 shadow"
          >
            {selectedChildUser.name[0]?.toUpperCase() ?? "S"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-gray-900 truncate">
                {selectedChildUser.name}
              </p>
              {selectedLink.relation && (
                <span
                  className="px-2 py-0.5 text-xs font-semibold
                  bg-blue-50 text-blue-700 rounded-full"
                >
                  {selectedLink.relation}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
          </div>

          {/* Quick stats (visible sm+) */}
          {rawResults.length > 0 && (
            <div className="hidden sm:flex items-center gap-5 shrink-0">
              <div className="text-center">
                <p
                  className={`text-xl font-bold ${
                    overallPct >= 75
                      ? "text-emerald-700"
                      : overallPct >= 40
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {overallPct}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Overall</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{examCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Exam{examCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary stats ─────────────────────────────────────── */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Exams Taken",
              value: examCount,
              icon: ClipboardCheck,
              color: "text-indigo-700",
              bg: "bg-indigo-50",
            },
            {
              label: "Subjects",
              value: subjectCount,
              icon: BookOpen,
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              label: "Overall %",
              value: `${overallPct}%`,
              icon: TrendingUp,
              color:
                overallPct >= 75
                  ? "text-emerald-700"
                  : overallPct >= 40
                    ? "text-amber-700"
                    : "text-red-700",
              bg:
                overallPct >= 75
                  ? "bg-emerald-50"
                  : overallPct >= 40
                    ? "bg-amber-50"
                    : "bg-red-50",
            },
            {
              label: "Best Exam",
              value: bestExam ? `${bestExam.pct}%` : "—",
              icon: Award,
              color: "text-purple-700",
              bg: "bg-purple-50",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm
                p-4 flex items-start gap-3"
            >
              <div
                className={`w-9 h-9 ${item.bg} rounded-lg flex items-center
                justify-center shrink-0 mt-0.5`}
              >
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

      {/* ── Exam result cards ─────────────────────────────────── */}
      {groups.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center"
        >
          <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No results yet for {selectedChildUser.name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Results will appear here once teachers have entered marks.
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
