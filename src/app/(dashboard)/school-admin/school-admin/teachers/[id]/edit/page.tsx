import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TeacherForm } from "@/components/school-admin/teacher-form";
import { updateTeacher } from "@/actions/teacher.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Teacher" };

interface Props { params: Promise<{ id: string }> }

export default async function EditTeacherPage({ params }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id } = await params;

  const teacher = await prisma.user.findFirst({
    where: { id, schoolId, role: "TEACHER" },
    include: { teacherProfile: true },
  });

  if (!teacher) notFound();

  const boundAction = updateTeacher.bind(null, teacher.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/teachers"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
          <p className="text-sm text-gray-500 mt-0.5">{teacher.name}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <TeacherForm action={boundAction} initialData={teacher} mode="edit" />
      </div>
    </div>
  );
}