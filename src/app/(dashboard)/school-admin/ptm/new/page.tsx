// import { requireRole }    from "@/lib/session";
// import { prisma }         from "@/lib/db";
// import { PtmSlotsForm }   from "@/components/school-admin/ptm-slots-form";
// import Link               from "next/link";
// import { ArrowLeft }      from "lucide-react";

// export const metadata = { title: "Create PTM Slots" };

// export default async function NewPtmSlotsPage() {
//   const user   = await requireRole(["SCHOOL_ADMIN"]);
//   const dbUser = await prisma.user.findUnique({
//     where:  { id: user.id },
//     select: { schoolId: true },
//   });
//   const schoolId = dbUser?.schoolId;
//   if (!schoolId)
//     return <p className="p-8 text-red-500">No school assigned.</p>;

//   const teacherProfiles = await prisma.teacherProfile.findMany({
//     where:   { user: { schoolId, isActive: true } },
//     include: { user: { select: { name: true } } },
//     orderBy: { user: { name: "asc" } },
//   });

//   const teachers = teacherProfiles.map((tp) => ({
//     id:           tp.id,
//     name:         tp.user.name,
//     employeeCode: tp.employeeCode,
//   }));

//   return (
//     <div className="max-w-2xl space-y-6">
//       <div className="flex items-center gap-3">
//         <Link
//           href="/school-admin/ptm"
//           className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
//             rounded-lg transition-colors"
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </Link>
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Create PTM Slots</h1>
//           <p className="text-sm text-gray-500 mt-0.5">
//             Generate appointment slots for a teacher on a specific date
//           </p>
//         </div>
//       </div>

//       {/* Info box */}
//       <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
//         <p className="text-sm text-blue-800">
//           <span className="font-semibold">How it works:</span> Enter the
//           teacher, date, start time, and duration. Slots are generated
//           automatically. School staff can manage available slots for teacher meetings.
//         </p>
//       </div>

//       <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
//         <PtmSlotsForm teachers={teachers} />
//       </div>
//     </div>
//   );
// }