// import { requireRole }   from "@/lib/session";
// import { prisma }        from "@/lib/db";
// import Link              from "next/link";
// import { deletePTMSlot } from "@/action/ptm.actions";
// import { RowActions }    from "@/components/ui/row-actions";
// import {
//   PTM_STATUS_LABELS,
//   PTM_STATUS_STYLE,
// }                        from "@/lib/validations/ptm";
// import {
//   Users2,
//   Plus,
//   CalendarClock,
//   ChevronDown,
// }                        from "lucide-react";
// import type { PtmStatus } from "@prisma/client";

// export const metadata = { title: "PTM Schedule" };

// interface Props {
//   searchParams: Promise<{
//     date?:     string;
//     teacherId?: string;
//   }>;
// }

// function formatDate(d: Date): string {
//   return new Date(d).toLocaleDateString("en-IN", {
//     weekday: "long",
//     day:     "numeric",
//     month:   "long",
//     year:    "numeric",
//     timeZone: "Asia/Kolkata",
//   });
// }

// export default async function SchoolAdminPtmPage({ searchParams }: Props) {
//   const user     = await requireRole(["SCHOOL_ADMIN"]);
//   const dbUser   = await prisma.user.findUnique({
//     where:  { id: user.id },
//     select: { schoolId: true },
//   });
//   const schoolId = dbUser?.schoolId;
//   if (!schoolId)
//     return <p className="p-8 text-red-500">No school assigned.</p>;

//   const sp         = await searchParams;
//   const dateFilter = sp.date      ?? "";
//   const teacherFilter = sp.teacherId ?? "";

//   // ── Load teachers for filter dropdown ────────────────────────
//   const teachers = await prisma.teacherProfile.findMany({
//     where:   { user: { schoolId, isActive: true } },
//     include: { user: { select: { name: true } } },
//     orderBy: { user: { name: "asc" } },
//   });

//   // ── Load slots with bookings ──────────────────────────────────
//   const slots = await prisma.ptmSlot.findMany({
//     where: {
//       schoolId,
//       ...(teacherFilter && { teacherProfileId: teacherFilter }),
//       ...(dateFilter     && {
//         date: new Date(`${dateFilter}T00:00:00.000Z`),
//       }),
//     },
//     include: {
//       teacherProfile: {
//         include: { user: { select: { name: true } } },
//       },
//       booking: {
//         include: {
//           studentProfile: {
//             include: { user: { select: { name: true } } },
//           },
//         },
//       },
//     },
//     orderBy: [{ date: "asc" }, { startTime: "asc" }],
//   });

//   // ── Summary counts ────────────────────────────────────────────
//   const total    = slots.length;
//   const booked   = slots.filter((s) => s.isBooked).length;
//   const available = total - booked;
//   const completed = slots.filter(
//     (s) => s.booking?.status === "COMPLETED",
//   ).length;

//   // Group by date
//   const byDate = new Map<string, typeof slots>();
//   for (const s of slots) {
//     const key = new Date(s.date).toISOString().split("T")[0]!;
//     if (!byDate.has(key)) byDate.set(key, []);
//     byDate.get(key)!.push(s);
//   }

//   return (
//     <div className="space-y-6">

//       {/* ── Header ─────────────────────────────────────────── */}
//       <div className="flex flex-wrap items-start justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             PTM Schedule
//           </h1>
//           <p className="text-sm text-gray-500 mt-0.5">
//             Manage PTM slots and track bookings
//           </p>
//         </div>
//         <Link
//           href="/school-admin/ptm/new"
//           className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
//             hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
//             transition-colors"
//         >
//           <Plus className="w-4 h-4" />
//           Create Slots
//         </Link>
//       </div>

//       {/* ── Stats ──────────────────────────────────────────── */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         {[
//           { label: "Total Slots",  value: total,    color: "text-gray-900",   bg: "bg-gray-50"    },
//           { label: "Available",    value: available, color: "text-blue-700",   bg: "bg-blue-50"    },
//           { label: "Booked",       value: booked,    color: "text-amber-700",  bg: "bg-amber-50"   },
//           { label: "Completed",    value: completed, color: "text-green-700",  bg: "bg-green-50"   },
//         ].map((item) => (
//           <div
//             key={item.label}
//             className={`${item.bg} rounded-xl border border-gray-100
//               shadow-sm px-4 py-3 text-center`}
//           >
//             <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
//             <p className="text-xs font-medium text-gray-400 mt-0.5">
//               {item.label}
//             </p>
//           </div>
//         ))}
//       </div>

//       {/* ── Filters ────────────────────────────────────────── */}
//       <form
//         method="GET"
//         className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
//       >
//         <div className="flex flex-wrap gap-3">

//           <input
//             type="date"
//             name="date"
//             defaultValue={dateFilter}
//             className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm
//               focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <div className="relative">
//             <select
//               name="teacherId"
//               defaultValue={teacherFilter}
//               className="appearance-none border border-gray-300 rounded-lg
//                 px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
//                 focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">All Teachers</option>
//               {teachers.map((t) => (
//                 <option key={t.id} value={t.id}>
//                   {t.user.name}
//                 </option>
//               ))}
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
//               w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>

//           <button
//             type="submit"
//             className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
//               text-sm font-semibold rounded-lg transition-colors"
//           >
//             Filter
//           </button>
          
//            <a href="/school-admin/ptm"
//             className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600
//               text-sm font-medium rounded-lg transition-colors inline-flex
//               items-center"
//           >
//             Clear
//           </a>
//         </div>
//       </form>

//       {/* ── Slots list ─────────────────────────────────────── */}
//       {slots.length === 0 ? (
//         <div className="bg-white rounded-xl border border-gray-100 shadow-sm
//           py-16 text-center">
//           <CalendarClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
//           <p className="text-sm font-medium text-gray-500">No PTM slots found</p>
//           <p className="text-xs text-gray-400 mt-1">
//             Create slots for teacher-student meetings.
//           </p>
//           <Link
//             href="/school-admin/ptm/new"
//             className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
//               text-xs font-semibold text-blue-600 bg-blue-50
//               hover:bg-blue-100 rounded-lg transition-colors"
//           >
//             <Plus className="w-3.5 h-3.5" />
//             Create First Slots
//           </Link>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {Array.from(byDate.entries()).map(([dateKey, daySlots]) => (
//             <div
//               key={dateKey}
//               className="bg-white rounded-xl border border-gray-100 shadow-sm
//                 overflow-hidden"
//             >
//               {/* Date header */}
//               <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100
//                 flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
//                   <p className="text-sm font-bold text-gray-800">
//                     {formatDate(new Date(`${dateKey}T00:00:00.000Z`))}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-xs text-gray-400">
//                     {daySlots.filter((s) => !s.isBooked).length} available
//                   </span>
//                   <span className="text-gray-300">·</span>
//                   <span className="text-xs text-gray-400">
//                     {daySlots.filter((s) => s.isBooked).length} booked
//                   </span>
//                 </div>
//               </div>

//               {/* Slot table */}
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr className="border-b border-gray-50">
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Time</th>
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Teacher</th>
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Status</th>
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Booked By</th>
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Student</th>
//                       <th className="px-5 py-3 text-xs font-semibold text-gray-500
//                         uppercase tracking-wide text-left">Meeting</th>
//                       <th className="px-5 py-3"></th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-50">
//                     {daySlots.map((slot) => (
//                       <tr
//                         key={slot.id}
//                         className={`hover:bg-gray-50/50 transition-colors ${
//                           slot.isBooked ? "bg-amber-50/10" : ""
//                         }`}
//                       >
//                         <td className="px-5 py-3.5">
//                           <span className="font-mono text-sm font-semibold
//                             text-gray-900">
//                             {slot.startTime} – {slot.endTime}
//                           </span>
//                         </td>
//                         <td className="px-5 py-3.5 text-sm text-gray-700">
//                           {slot.teacherProfile.user.name}
//                         </td>
//                         <td className="px-5 py-3.5">
//                           <span className={`px-2.5 py-1 text-xs font-semibold
//                             rounded-full ${
//                               slot.isBooked
//                                 ? "bg-amber-50 text-amber-700 border border-amber-200"
//                                 : "bg-green-50 text-green-700 border border-green-200"
//                             }`}>
//                             {slot.isBooked ? "Booked" : "Available"}
//                           </span>
//                         </td>
//                         <td className="px-5 py-3.5 text-sm text-gray-600">
//                           <span className="text-gray-300">—</span>
//                         </td>
//                         <td className="px-5 py-3.5 text-sm text-gray-600">
//                           {slot.booking
//                             ? slot.booking.studentProfile.user.name
//                             : <span className="text-gray-300">—</span>}
//                         </td>
//                         <td className="px-5 py-3.5">
//                           {slot.booking ? (
//                             <span className={`px-2.5 py-1 text-xs font-semibold
//                               rounded-full ${
//                                 PTM_STATUS_STYLE[
//                                   slot.booking.status as PtmStatus
//                                 ]
//                               }`}>
//                               {PTM_STATUS_LABELS[
//                                 slot.booking.status as PtmStatus
//                               ]}
//                             </span>
//                           ) : (
//                             <span className="text-gray-300 text-xs">—</span>
//                           )}
//                         </td>
//                         <td className="px-5 py-3.5 text-right">
//                           <RowActions
//                             editHref="#"
//                             deleteAction={deletePTMSlot.bind(null, slot.id)}
//                             entityLabel="PTM slot"
//                           />
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }