import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StudentForm } from "@/components/school-admin/student-form";
import { createStudent } from "@/action/student.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const sections = await prisma.section.findMany({
    where: { schoolId },
    include: { class: true },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/students"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Student</h1>
          <p className="text-sm text-gray-500 mt-0.5">Enroll a new student in your school</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StudentForm sections={sections} action={createStudent} mode="create" />
      </div>
    </div>
  );
}
