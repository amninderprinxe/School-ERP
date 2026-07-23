import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { ExamForm }     from "@/components/school-admin/exam-form";
import { createExam }   from "@/action/exam.actions";
import Link             from "next/link";
import { ArrowLeft }    from "lucide-react";

export const metadata = { title: "Create Exam" };

export default async function NewExamPage() {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const classes = await prisma.class.findMany({
    where:   { schoolId },
    orderBy: { name: "asc" },
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set up a new exam for a class
          </p>
        </div>
      </div>

      {/* ── Info banner ──────────────────────────────────── */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">After creating the exam,</span> go
          to{" "}
          <span className="font-semibold">Exams → Enter Results</span> to add
          marks for each student and subject.
        </p>
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <ExamForm
          classes={classes}
          action={createExam}
          mode="create"
        />
      </div>

    </div>
  );
}
