import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ClassForm } from "@/components/school-admin/class-form";
import { updateClass } from "@/action/class.actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Class" };

interface Props { params: Promise<{ id: string }> }

export default async function EditClassPage({ params }: Props) {
  const user = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id } = await params;

  const klass = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!klass) notFound();

  const boundAction = updateClass.bind(null, klass.id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/school-admin/classes"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
          <p className="text-sm text-gray-500 mt-0.5">{klass.name}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <ClassForm action={boundAction} initialData={klass} mode="edit" />
      </div>
    </div>
  );
}
