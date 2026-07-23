import { requireRole }   from "@/lib/session";
import { prisma }        from "@/lib/db";
import { SubjectForm }   from "@/components/school-admin/subject-form";
import { updateSubject } from "@/action/subject.actions";
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";
import { notFound }      from "next/navigation";

export const metadata = { title: "Edit Subject" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSubjectPage({ params }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id }   = await params;

  const [subject, classes, teacherProfiles] = await Promise.all([
    prisma.subject.findFirst({
      where:   { id, schoolId },
      include: {
        teachers: { select: { teacherProfileId: true } },
      },
    }),
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

  if (!subject) notFound();

  const teachers = teacherProfiles.map((tp) => ({
    id:           tp.id,
    name:         tp.user.name,
    employeeCode: tp.employeeCode,
  }));

  const initialData = {
    name:                      subject.name,
    code:                      subject.code,
    classId:                   subject.classId,
    assignedTeacherProfileIds: subject.teachers.map(
      (t) => t.teacherProfileId,
    ),
  };

  const boundAction = updateSubject.bind(null, subject.id);

  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/subjects"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Subject</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subject.name}</p>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SubjectForm
          classes={classes}
          teachers={teachers}
          action={boundAction}
          initialData={initialData}
          mode="edit"
        />
      </div>

    </div>
  );
}
