import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SectionForm } from "@/components/school-admin/section-form";
import { updateSection } from "@/action/section.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Section" };

interface Props { params: Promise<{ id: string }> }

export default async function EditSectionPage({ params }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id } = await params;

  const [section, classes, teacherProfiles] = await Promise.all([
  prisma.section.findFirst({
    where: { id, schoolId },
    include: {
      class: true,
    },
  }),

  prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  }),

  prisma.teacherProfile.findMany({
    where: { user: { schoolId } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }),
]);

  if (!section) notFound();

  const teachers = teacherProfiles.map((tp) => ({
    id:           tp.id,
    name:         tp.user.name,
    employeeCode: tp.employeeCode,
  }));

  const boundAction = updateSection.bind(null, section.id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/sections"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Section</h1>
          <p className="text-sm text-gray-500 mt-0.5">{section.class ? section.class.name + " - " : ""}{section.name}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SectionForm
          classes={classes}
          teachers={teachers}
          action={boundAction}
          initialData={section}
          mode="edit"
        />
      </div>
    </div>
  );
}