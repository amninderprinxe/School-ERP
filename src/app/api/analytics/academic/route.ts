import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db";

export const dynamic = "force-dynamic";

const GRADES = [
  { grade: "A+", min: 90 },
  { grade: "A",  min: 80 },
  { grade: "B+", min: 70 },
  { grade: "B",  min: 60 },
  { grade: "C",  min: 50 },
  { grade: "D",  min: 40 },
  { grade: "F",  min: 0  },
];

function getGrade(pct: number): string {
  return GRADES.find(g => pct >= g.min)?.grade ?? "F";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const role     = session.user.role;
  const schoolId = session.user.schoolId ?? "";
  if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const [results, exams] = await Promise.all([
    prisma.result.findMany({
      where:   { schoolId },
      include: {
        subject: { select: { name: true, code: true } },
        exam:    { select: { name: true, examType: true, class: { select: { name: true } } } },
      },
    }),
    prisma.exam.findMany({
      where:   { schoolId },
      include: { class: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take:    20,
    }),
  ]);

  // ── Subject performance ───────────────────────────────────────
  const subjectMap = new Map<string, {
    name: string; total: number; sum: number; max: number; maxMarks: number; pass: number;
  }>();

  for (const r of results) {
    const subName = r.subject.name;
    const cur     = subjectMap.get(subName) ?? {
      name: subName, total: 0, sum: 0, max: 0, maxMarks: r.maxMarks, pass: 0,
    };
    const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
    cur.total++;
    cur.sum     += pct;
    cur.max      = Math.max(cur.max, pct);
    cur.maxMarks = r.maxMarks;
    if (pct >= 40) cur.pass++;
    subjectMap.set(subName, cur);
  }

  const subjects = Array.from(subjectMap.values())
    .filter(s => s.total >= 2)
    .map(s => ({
      subject:  s.name,
      avg:      Math.round(s.sum / s.total),
      highest:  Math.round(s.max),
      passRate: Math.round((s.pass / s.total) * 100),
      count:    s.total,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  // ── Per-exam pass rate ────────────────────────────────────────
  const examMap = new Map<string, { name: string; className: string; pass: number; total: number; sum: number }>();
  for (const r of results) {
    const key = r.examId;
    const cur = examMap.get(key) ?? {
      name:      r.exam.name,
      className: r.exam.class.name,
      pass: 0, total: 0, sum: 0,
    };
    const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
    cur.total++;
    cur.sum += pct;
    if (pct >= 40) cur.pass++;
    examMap.set(key, cur);
  }
  const examResults = Array.from(examMap.values())
    .filter(e => e.total >= 2)
    .map(e => ({
      exam:      e.name,
      class:     e.className,
      avg:       Math.round(e.sum / e.total),
      passRate:  Math.round((e.pass / e.total) * 100),
      count:     e.total,
    }))
    .sort((a, b) => b.passRate - a.passRate)
    .slice(0, 10);

  // ── Grade distribution ────────────────────────────────────────
  const gradeCount: Record<string, number> = {};
  for (const r of results) {
    const pct   = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
    const grade = getGrade(pct);
    gradeCount[grade] = (gradeCount[grade] ?? 0) + 1;
  }
  const total      = results.length;
  const gradesDist = GRADES.map(g => ({
    grade: g.grade,
    count: gradeCount[g.grade] ?? 0,
    pct:   total > 0 ? Math.round(((gradeCount[g.grade] ?? 0) / total) * 100) : 0,
  }));

  // ── Summary ───────────────────────────────────────────────────
  const overallSum  = results.reduce((s, r) =>
    s + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0);
  const overallPass = results.filter(r =>
    r.maxMarks > 0 && (r.marksObtained / r.maxMarks) * 100 >= 40).length;

  return NextResponse.json({
    subjects, examResults, gradesDist,
    summary: {
      totalResults:  total,
      overallAvg:    total > 0 ? Math.round(overallSum / total) : 0,
      overallPass:   total > 0 ? Math.round((overallPass / total) * 100) : 0,
      subjectCount:  subjectMap.size,
      examCount:     examMap.size,
    },
  });
}