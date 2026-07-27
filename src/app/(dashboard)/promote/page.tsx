import { requireRole }           from "@/lib/session";
import { prisma }                from "@/lib/db";
import {
  PromoteStudentsClient,
  type ClassOption,
}                                from "@/components/school-admin/promote-students-client";
import {
  TrendingUp,
  AlertTriangle,
}                                from "lucide-react";

export const metadata = { title: "Promote Students" };

export default async function PromoteStudentsPage() {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId)
    return <p className="p-8 text-red-500">No school assigned.</p>;

  // Load all classes + sections (lightweight — no students yet)
  const rawClasses = await prisma.class.findMany({
    where:   { schoolId },
    include: {
      sections: {
        orderBy: { name: "asc" },
        select:  { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const classes: ClassOption[] = rawClasses.map((c) => ({
    id:       c.id,
    name:     c.name,
    sections: c.sections,
  }));

  // Stats: students with no section (already graduated / not assigned)
  const [totalStudents, assignedStudents] = await Promise.all([
    prisma.studentProfile.count({
      where: { user: { schoolId, isActive: true } },
    }),
    prisma.studentProfile.count({
      where: { user: { schoolId, isActive: true }, sectionId: { not: null } },
    }),
  ]);
  const unassigned = totalStudents - assignedStudents;

  return (
    <div className="max-w-4xl space-y-6">

      {/* Info banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Active Students",
            value: totalStudents,
            color: "text-gray-900",
            bg:    "bg-white",
          },
          {
            label: "Assigned to a Section",
            value: assignedStudents,
            color: "text-emerald-700",
            bg:    "bg-emerald-50",
          },
          {
            label: "Unassigned / Graduated",
            value: unassigned,
            color: unassigned > 0 ? "text-amber-700" : "text-gray-500",
            bg:    unassigned > 0 ? "bg-amber-50" : "bg-gray-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`${item.bg} rounded-xl border border-gray-100
              shadow-sm px-5 py-4`}
          >
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border
        border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            This action updates student section assignments
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            All historical data (attendance, results, fees) is preserved.
            Only the student&apos;s current section changes. You can re-assign
            any student from the Students page if needed.
          </p>
        </div>
      </div>

      {/* No classes */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No classes found</p>
          <p className="text-xs text-gray-400 mt-1">
            Create classes and sections first, then use this tool to
            promote students at year-end.
          </p>
        </div>
      ) : (
        <PromoteStudentsClient classes={classes} />
      )}
    </div>
  );
}