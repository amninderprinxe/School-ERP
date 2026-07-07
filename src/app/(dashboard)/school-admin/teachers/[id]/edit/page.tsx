import { requireRole }          from "@/lib/session";
import { prisma }               from "@/lib/db";
import { TeacherForm }          from "@/components/school-admin/teacher-form";
import { updateTeacher }        from "@/action/teacher.actions";
import { ResetPasswordButton }  from "@/components/ui/reset-password-button";
import Link                     from "next/link";
import { ArrowLeft, KeyRound }  from "lucide-react";
import { notFound }             from "next/navigation";

export const metadata = { title: "Edit Teacher" };

interface Props { params: Promise<{ id: string }> }

export default async function EditTeacherPage({ params }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id }   = await params;

  const teacher = await prisma.user.findFirst({
    where:   { id, schoolId, role: "TEACHER" },
    include: { teacherProfile: true },
  });

  if (!teacher) notFound();

  const boundAction = updateTeacher.bind(null, teacher.id);

  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/teachers"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
          <p className="text-sm text-gray-500 mt-0.5">{teacher.name}</p>
        </div>
      </div>

      {/* ── Edit form card ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <TeacherForm
          action={boundAction}
          initialData={teacher}
          mode="edit"
        />
      </div>

      {/* ── Reset password card ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Reset Password
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Reset this teacher's password to the platform default
            </p>
          </div>
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center
          justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700">
              Clicking reset will set the teacher's password to{" "}
              <span className="font-mono font-semibold text-gray-900">
                Password@123
              </span>.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Notify the teacher to change it on their next login.
            </p>
          </div>
          <ResetPasswordButton
            targetUserId={teacher.id}
            userName={teacher.name}
          />
        </div>
      </div>

    </div>
  );
}