import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StudentForm } from "@/components/school-admin/student-form";
import { updateStudent } from "@/actions/student.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Student" };

interface Props { params: Promise<{ id: string }> }

export default async function EditStudentPage({ params }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id } = await params;

  const [student, sections] = await Promise.all([
    prisma.user.findFirst({
      where: { id, schoolId, role: "STUDENT" },
      include: { studentProfile: true },
    }),
    prisma.section.findMany({
      where: { schoolId },
      include: { class: true },
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  if (!student) notFound();

  const boundAction = updateStudent.bind(null, student.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/students"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
          <p className="text-sm text-gray-500 mt-0.5">{student.name}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StudentForm sections={sections} action={boundAction} initialData={student} mode="edit" />
      </div>
    </div>
  );
}