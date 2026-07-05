import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import { SubjectForm } from "../../../../../components/school-admin/subject-form";
import { createSubject } from "@/action/subject.actions";   // ← singular
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";

export const metadata = { title: "Add Subject" };

export default async function NewSubjectPage() {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const [classes, teacherProfiles] = await Promise.all([
    prisma.class.findMany({
      where:   { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.teacherProfile.findMany({
      where:   { user: { schoolId } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const teachers = teacherProfiles.map((tp) => ({
    id:           tp.id,
    name:         tp.user.name,
    employeeCode: tp.employeeCode,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/subjects"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Subject</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a new subject and optionally assign teachers
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SubjectForm
          classes={classes}
          teachers={teachers}
          action={createSubject}
          mode="create"
        />
      </div>
    </div>
  );
}