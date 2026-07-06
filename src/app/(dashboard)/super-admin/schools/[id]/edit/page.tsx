import { requireRole }  from "@/lib/session";
import { prisma }       from "@/lib/db";
import { SchoolForm }   from "@/components/super-admin/school-form";
import { updateSchool } from "@/action/school.actions";
import Link             from "next/link";
import { ArrowLeft }    from "lucide-react";
import { notFound }     from "next/navigation";

export const metadata = { title: "Edit School" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSchoolPage({ params }: Props) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (!school) notFound();

  const boundAction = updateSchool.bind(null, school.id);

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/super-admin/schools"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit School</h1>
          <p className="text-sm text-gray-500 mt-0.5">{school.name}</p>
        </div>
      </div>

      {/* ── Quick stats strip ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Users",  value: school._count.users  },
          { label: "Slug",         value: school.slug           },
          { label: "Created",      value: new Date(school.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SchoolForm
          action={boundAction}
          initialData={{
            name:    school.name,
            slug:    school.slug,
            email:   school.email,
            phone:   school.phone,
            address: school.address,
            status:  school.status,
          }}
          mode="edit"
        />
      </div>

    </div>
  );
}