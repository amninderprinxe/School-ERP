import { requireRole } from "@/lib/session";
import { TeacherForm } from "@/components/school-admin/teacher-form";
import { createTeacher } from "@/action/teacher.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Add Teacher" };

export default async function NewTeacherPage() {
  await requireRole(["SCHOOL_ADMIN"]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/teachers"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Teacher</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a new teacher at your school</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <TeacherForm action={createTeacher} mode="create" />
      </div>
    </div>
  );
}
