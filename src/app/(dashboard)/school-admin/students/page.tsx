import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StudentTableClient } from "@/components/student-profile/student-table-client";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const [rawStudents, classes] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      include: {
        studentProfile: {
          include: { section: { include: { class: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const students = rawStudents.map((s) => {
    const prof = s.studentProfile;
    const section = prof?.section;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      gender: s.gender,
      rollNumber: (prof as any)?.rollNumber ?? (prof as any)?.rollNo ?? null,
      admissionNo: prof?.admissionNo ?? null,
      className: section?.class?.name ?? "",
      sectionName: section?.name ?? "",
    };
  });

  const classNames = classes.map((c) => c.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled
          </p>
        </div>
        <Link
          href="/school-admin/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Client Filter & Table */}
      <StudentTableClient students={students} classes={classNames} />
    </div>
  );
}