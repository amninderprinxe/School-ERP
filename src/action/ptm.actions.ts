// "use server";

// import { requireRole } from "@/lib/session";
// import { prisma } from "@/lib/db";
// import { revalidatePath } from "next/cache";
// import {
//   CreatePTMSlotsSchema,
//   BookPTMSlotSchema,
//   UpdateMeetingSchema,
//   generateSlotTimes,
// } from "@/lib/validations/ptm";
// import type { ActionResult } from "@/types/actions";
// import { createNotification } from "@/lib/notify";
// import type { PtmStatus } from "@prisma/client";

// async function getSchoolId(userId: string): Promise<string | null> {
//   const u = await prisma.user.findUnique({
//     where: { id: userId },
//     select: { schoolId: true },
//   });
//   return u?.schoolId ?? null;
// }

// // ─────────────────────────────────────────────────────────────────
// // CREATE SLOTS — School Admin
// // ─────────────────────────────────────────────────────────────────

// export async function createPTMSlots(
//   data: unknown,
// ): Promise<ActionResult> {
//   try {
//     const user = await requireRole(["SCHOOL_ADMIN"]);
//     const schoolId = await getSchoolId(user.id);
//     if (!schoolId) return { success: false, error: "No school assigned." };

//     const parsed = CreatePTMSlotsSchema.safeParse(data);
//     if (!parsed.success) {
//       return {
//         success: false,
//         error: "Please fix the errors below.",
//         fieldErrors: parsed.error.flatten().fieldErrors,
//       };
//     }

//     const {
//       teacherProfileId,
//       date,
//       startTime,
//       durationMins,
//       totalSlots,
//       notes,
//     } = parsed.data;

//     // Verify teacher belongs to this school
//     const tp = await prisma.teacherProfile.findFirst({
//       where: { id: teacherProfileId, user: { schoolId } },
//     });
//     if (!tp)
//       return { success: false, error: "Teacher not found in your school." };

//     const slots = generateSlotTimes(startTime, durationMins, totalSlots);
//     const slotDate = new Date(`${date}T00:00:00.000Z`);
//     let created = 0;

//     for (const slot of slots) {
//       try {
//         await (prisma as any).ptmSlot.create({
//           data: {
//             date: slotDate,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             notes: notes?.trim() || null,
//             schoolId,
//             teacherProfileId,
//           },
//         });
//         created++;
//       } catch {
//         // Skip duplicate slots silently
//       }
//     }

//     revalidatePath("/school-admin/ptm");
//     return { success: true };
//   } catch (e) {
//     console.error("[createPTMSlots]", e);
//     return { success: false, error: "Failed to create PTM slots." };
//   }
// }

// // ─────────────────────────────────────────────────────────────────
// // DELETE SLOT — School Admin
// // ─────────────────────────────────────────────────────────────────

// export async function deletePTMSlot(slotId: string): Promise<ActionResult> {
//   try {
//     const user = await requireRole(["SCHOOL_ADMIN"]);
//     const schoolId = await getSchoolId(user.id);
//     if (!schoolId) return { success: false, error: "No school assigned." };

//     const slot = await (prisma as any).ptmSlot.findFirst({
//       where: { id: slotId, schoolId },
//       include: { booking: true },
//     });
//     if (!slot) return { success: false, error: "Slot not found." };

//     if (slot.booking?.status === "SCHEDULED") {
//       return {
//         success: false,
//         error:
//           "Cannot delete a slot with an active booking. Cancel the meeting first.",
//       };
//     }

//     await (prisma as any).ptmSlot.delete({ where: { id: slotId } });
//     revalidatePath("/school-admin/ptm");
//     return { success: true };
//   } catch (e) {
//     console.error("[deletePTMSlot]", e);
//     return { success: false, error: "Failed to delete slot." };
//   }
// }

// // ─────────────────────────────────────────────────────────────────
// // BOOK SLOT — Disabled while parent portal is removed
// // ─────────────────────────────────────────────────────────────────

// export async function bookPTMSlot(): Promise<ActionResult> {
//   return {
//     success: false,
//     error: "PTM booking is currently unavailable.",
//   };
// }

// // ─────────────────────────────────────────────────────────────────
// // CANCEL BOOKING — Disabled while parent portal is removed
// // ─────────────────────────────────────────────────────────────────

// export async function cancelPTMBooking(): Promise<ActionResult> {
//   return {
//     success: false,
//     error: "PTM booking cancellation is currently unavailable.",
//   };
// }

// // ─────────────────────────────────────────────────────────────────
// // UPDATE MEETING — Teacher
// // ─────────────────────────────────────────────────────────────────

// export async function updatePTMMeeting(data: unknown): Promise<ActionResult> {
//   try {
//     const user = await requireRole(["TEACHER"]);
//     const schoolId = await getSchoolId(user.id);
//     if (!schoolId) return { success: false, error: "No school assigned." };

//     const parsed = UpdateMeetingSchema.safeParse(data);
//     if (!parsed.success) {
//       return {
//         success: false,
//         error: "Invalid data.",
//         fieldErrors: parsed.error.flatten().fieldErrors,
//       };
//     }

//     const { meetingId, status, teacherNote } = parsed.data;

//     const tp = await prisma.teacherProfile.findUnique({
//       where: { userId: user.id },
//     });
//     if (!tp) return { success: false, error: "Teacher profile not found." };

//     const meeting = await (prisma as any).ptmMeeting.findFirst({
//       where: {
//         id: meetingId,
//         slot: { teacherProfileId: tp.id, schoolId },
//       },
//     });
//     if (!meeting) return { success: false, error: "Meeting not found." };

//     await prisma.ptmMeeting.update({
//       where: { id: meetingId },
//       data: {
//         status: status as PtmStatus,
//         teacherNote: teacherNote?.trim() || null,
//       },
//     });

//     // If teacher cancels, free the slot
//     if (status === "CANCELLED") {
//       await prisma.ptmSlot.update({
//         where: { id: meeting.slotId },
//         data: { isBooked: false },
//       });
//     }

//     // No parent-facing notification because parent portal is removed.

//     revalidatePath("/teacher/ptm");
//     return { success: true };
//   } catch (e) {
//     console.error("[updatePTMMeeting]", e);
//     return { success: false, error: "Failed to update meeting." };
//   }
// }