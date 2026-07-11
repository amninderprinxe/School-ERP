import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { ExamForm }     from "@/components/school-admin/exam-form";
import { updateExam }   from "@/action/exam.actions";
import Link             from "next/link";
import { ArrowLeft }    from "lucide-react";
import { notFound }     from "next/navigation";
import { EXAM_TYPE_LABELS } from "@/lib/validations/exam";

export const metadata = { title: "Edit Exam" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id }   = await params;

  const [exam, classes] = await Promise.all([
    prisma.exam.findFirst({
      where:   { id, schoolId },
      include: {
        class:  true,
        _count: { select: { results: true } },
      },
    }),
    prisma.class.findMany({
      where:   { schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!exam) notFound();

  const hasResults = exam._count.results > 0;
  const boundAction = updateExam.bind(null, exam.id);

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/exams"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
          <p className="text-sm text-gray-500 mt-0.5">{exam.name}</p>
        </div>
      </div>

      {/* ── Quick stats strip ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Class",      value: exam.class.name },
          { label: "Type",       value: EXAM_TYPE_LABELS[exam.examType as keyof typeof EXAM_TYPE_LABELS] },
          { label: "Results",    value: `${exam._count.results} entered` },
          {
            label: "Created",
            value: new Date(exam.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            }),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <ExamForm
          classes={classes}
          action={boundAction}
          initialData={{
            name:      exam.name,
            examType:  exam.examType,
            classId:   exam.classId,
            startDate: exam.startDate,
            endDate:   exam.endDate,
          }}
          mode="edit"
          hasResults={hasResults}
        />
      </div>

    </div>
  );
}