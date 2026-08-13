// "use client";

// import { useState, useTransition } from "react";
// import { Palette, Check, Save, AlertCircle } from "lucide-react";
// import { updateSchoolBranding } from "@/action/school-settings.actions";
// import type { SchoolSettingsData } from "@/lib/validations/school-settings";

// const PRESET_COLORS = [
//   "#2563eb", "#1d4ed8", "#4338ca", "#7c3aed", "#6d28d9",
//   "#059669", "#0f766e", "#0284c7", "#dc2626", "#e11d48",
//   "#ea580c", "#d97706", "#475569", "#334155", "#1f2937", "#0f172a",
// ];

// export function BrandingSection({ school }: { school: SchoolSettingsData }) {
//   const [isPending, startTransition] = useTransition();
//   const [selectedColor, setSelectedColor] = useState(school.primaryColor || "#059669");
//   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setMessage(null);

//     const formData = new FormData();
//     formData.append("primaryColor", selectedColor);

//     startTransition(async () => {
//       const res = await updateSchoolBranding(formData);
//       if (res.success) {
//         setMessage({ type: "success", text: res.message || "Branding updated successfully." });
//       } else {
//         setMessage({ type: "error", text: res.error || "Failed to update branding." });
//       }
//     });
//   };

//   return (
//     <section id="branding" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
//       <div className="flex items-center gap-3 mb-6">
//         <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
//           <Palette className="w-5 h-5" />
//         </div>
//         <div>
//           <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Branding</h2>
//           <p className="text-xs text-gray-500 dark:text-gray-400">Customize colors and visual identity</p>
//         </div>
//       </div>

//       <form onSubmit={handleSubmit} className="space-y-6">
//         {/* Preset Palettes */}
//         <div>
//           <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
//             Primary Color
//           </label>
//           <div className="grid grid-cols-8 gap-2.5 max-w-xl">
//             {PRESET_COLORS.map((color) => (
//               <button
//                 key={color}
//                 type="button"
//                 onClick={() => setSelectedColor(color)}
//                 style={{ backgroundColor: color }}
//                 className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//               >
//                 {selectedColor.toLowerCase() === color.toLowerCase() && (
//                   <Check className="w-4 h-4 text-white drop-shadow" />
//                 )}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Custom Hex Input */}
//         <div>
//           <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
//             Custom Hex
//           </label>
//           <div className="flex items-center gap-3 max-w-xs">
//             <div
//               className="w-8 h-8 rounded-lg shrink-0 border border-gray-200 shadow-inner"
//               style={{ backgroundColor: selectedColor }}
//             />
//             <input
//               type="text"
//               value={selectedColor}
//               onChange={(e) => setSelectedColor(e.target.value)}
//               placeholder="#059669"
//               className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Message Banner */}
//         {message && (
//           <div
//             className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium ${
//               message.type === "error"
//                 ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
//                 : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
//             }`}
//           >
//             {message.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
//             {message.text}
//           </div>
//         )}

//         {/* Action Button */}
//         <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
//           <button
//             type="submit"
//             disabled={isPending}
//             className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
//           >
//             <Save className="w-4 h-4" />
//             {isPending ? "Saving..." : "Save Changes"}
//           </button>
//         </div>
//       </form>
//     </section>
//   );
// }