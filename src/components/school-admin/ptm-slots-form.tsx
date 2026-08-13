// "use client";

// import { useState, useTransition, useMemo } from "react";
// import { useRouter }                        from "next/navigation";
// import { createPTMSlots }                   from "@/action/ptm.actions";
// import { generateSlotTimes }                from "@/lib/validations/ptm";
// import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

// export interface TeacherOption {
//   id:   string;   // teacherProfile.id
//   name: string;
//   employeeCode: string | null;
// }

// interface Props {
//   teachers: TeacherOption[];
// }

// const INPUT =
//   "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white " +
//   "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

// const LABEL = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

// export function PtmSlotsForm({ teachers }: Props) {
//   const router                       = useRouter();
//   const [isPending, startTransition] = useTransition();

//   const [teacherId,    setTeacherId]    = useState(teachers[0]?.id ?? "");
//   const [date,         setDate]         = useState("");
//   const [startTime,    setStartTime]    = useState("09:00");
//   const [duration,     setDuration]     = useState(20);
//   const [totalSlots,   setTotalSlots]   = useState(8);
//   const [notes,        setNotes]        = useState("");

//   const [success, setSuccess]   = useState<string | null>(null);
//   const [error,   setError]     = useState<string | null>(null);

//   // ── Live preview ──────────────────────────────────────────────
//   const preview = useMemo(() => {
//     if (!startTime || duration < 5 || totalSlots < 1) return [];
//     return generateSlotTimes(startTime, duration, totalSlots);
//   }, [startTime, duration, totalSlots]);

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setSuccess(null);
//     setError(null);

//     startTransition(async () => {
//       const res = await createPTMSlots({
//         teacherProfileId: teacherId,
//         date,
//         startTime,
//         durationMins:     duration,
//         totalSlots,
//         notes:            notes.trim() || undefined,
//       });

//       if (res.success && res.data) {
//         setSuccess(`✅ ${res.data.created} slot${res.data.created !== 1 ? "s" : ""} created successfully!`);
//         setTimeout(() => {
//           router.push("/school-admin/ptm");
//           router.refresh();
//         }, 1500);
//       } else if (!res.success) {
//         setError(res.error?? null);
//       }
//     });
//   };

//   return (
//     <form onSubmit={handleSubmit} noValidate className="space-y-6">

//       {/* Error / Success */}
//       {error && (
//         <div className="flex items-center gap-2.5 p-4 bg-red-50 border
//           border-red-200 rounded-xl">
//           <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
//           <p className="text-sm text-red-600 font-medium">{error}</p>
//         </div>
//       )}
//       {success && (
//         <div className="flex items-center gap-2.5 p-4 bg-green-50 border
//           border-green-200 rounded-xl">
//           <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
//           <p className="text-sm text-green-700 font-medium">{success}</p>
//         </div>
//       )}

//       {/* Configuration */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

//         {/* Teacher */}
//         <div className="sm:col-span-2">
//           <label className={LABEL}>Teacher <span className="text-red-500">*</span></label>
//           {teachers.length === 0 ? (
//             <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200
//               rounded-lg px-3 py-2.5">
//               No teachers found. Add teachers first.
//             </p>
//           ) : (
//             <select
//               value={teacherId}
//               onChange={(e) => setTeacherId(e.target.value)}
//               required
//               className={INPUT}
//             >
//               <option value="">— Select teacher —</option>
//               {teachers.map((t) => (
//                 <option key={t.id} value={t.id}>
//                   {t.name}{t.employeeCode ? ` (${t.employeeCode})` : ""}
//                 </option>
//               ))}
//             </select>
//           )}
//         </div>

//         {/* Date */}
//         <div>
//           <label className={LABEL}>Date <span className="text-red-500">*</span></label>
//           <input
//             type="date"
//             value={date}
//             onChange={(e) => setDate(e.target.value)}
//             required
//             min={new Date().toISOString().split("T")[0]}
//             className={INPUT}
//           />
//         </div>

//         {/* Start Time */}
//         <div>
//           <label className={LABEL}>Start Time <span className="text-red-500">*</span></label>
//           <input
//             type="time"
//             value={startTime}
//             onChange={(e) => setStartTime(e.target.value)}
//             required
//             className={INPUT}
//           />
//         </div>

//         {/* Duration */}
//         <div>
//           <label className={LABEL}>
//             Slot Duration{" "}
//             <span className="normal-case font-normal text-gray-400">(minutes)</span>
//           </label>
//           <input
//             type="number"
//             value={duration}
//             onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
//             min={5}
//             max={120}
//             className={INPUT}
//           />
//           <p className="text-xs text-gray-400 mt-1">
//             Each meeting slot lasts this many minutes.
//           </p>
//         </div>

//         {/* Total Slots */}
//         <div>
//           <label className={LABEL}>
//             Number of Slots <span className="text-red-500">*</span>
//           </label>
//           <input
//             type="number"
//             value={totalSlots}
//             onChange={(e) => setTotalSlots(parseInt(e.target.value) || 8)}
//             min={1}
//             max={50}
//             className={INPUT}
//           />
//           <p className="text-xs text-gray-400 mt-1">
//             Total appointment slots to create.
//           </p>
//         </div>

//         {/* Notes (optional) */}
//         <div className="sm:col-span-2">
//           <label className={LABEL}>
//             Admin Notes{" "}
//             <span className="normal-case font-normal text-gray-400">(optional)</span>
//           </label>
//           <input
//             type="text"
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             placeholder="e.g. Room 201, Block B"
//             className={INPUT}
//           />
//         </div>
//       </div>

//       {/* ── Live Preview ───────────────────────────────────────── */}
//       {preview.length > 0 && (
//         <div className="border border-gray-100 rounded-xl overflow-hidden">
//           <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex
//             items-center gap-2">
//             <Clock className="w-4 h-4 text-gray-400" />
//             <p className="text-sm font-semibold text-gray-700">
//               Preview — {preview.length} slot{preview.length !== 1 ? "s" : ""}
//             </p>
//             {date && (
//               <span className="text-xs text-gray-400 ml-1">
//                 · {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
//                   weekday: "short", day: "numeric",
//                   month: "long", year: "numeric",
//                 })}
//               </span>
//             )}
//           </div>
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
//             {preview.map((slot, i) => (
//               <div
//                 key={i}
//                 className="flex items-center gap-2 px-3 py-2 bg-blue-50
//                   border border-blue-100 rounded-lg"
//               >
//                 <span className="text-xs font-bold text-blue-500 shrink-0 w-5">
//                   {i + 1}
//                 </span>
//                 <span className="text-xs font-semibold text-blue-900">
//                   {slot.startTime} – {slot.endTime}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Submit */}
//       <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
//         <button
//           type="submit"
//           disabled={isPending || !teacherId || !date || preview.length === 0}
//           className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600
//             hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
//             text-white text-sm font-semibold rounded-lg transition-colors"
//         >
//           {isPending ? (
//             <>
//               <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10"
//                   stroke="currentColor" strokeWidth="4" />
//                 <path className="opacity-75" fill="currentColor"
//                   d="M4 12a8 8 0 018-8v8H4z" />
//               </svg>
//               Creating…
//             </>
//           ) : (
//             `Create ${preview.length} Slot${preview.length !== 1 ? "s" : ""}`
//           )}
//         </button>
//       </div>
//     </form>
//   );
// }