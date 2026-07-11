"use server";

import { auth }           from "@/lib/auth";
import { prisma }         from "@/lib/db";
import bcrypt             from "bcryptjs";
import { ChangePasswordSchema } from "@/lib/validations/password";
import type { ActionResult }    from "@/types/actions";

const DEFAULT_RESET_PASSWORD = "Password@123";

// ─────────────────────────────────────────────────────────────────
// CHANGE OWN PASSWORD  (any authenticated user)
// ─────────────────────────────────────────────────────────────────
export async function changePassword(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error:   "You must be logged in to change your password.",
      };
    }

    const parsed = ChangePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword:     formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch the stored hash
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, password: true },
    });
    if (!user) return { success: false, error: "User not found." };

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: { currentPassword: ["Current password is incorrect."] },
      };
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed },
    });

    return { success: true };
  } catch (e) {
    console.error("[changePassword]", e);
    return {
      success: false,
      error:   "Failed to change password. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// RESET ANOTHER USER'S PASSWORD  (SUPER_ADMIN or SCHOOL_ADMIN)
// ─────────────────────────────────────────────────────────────────
export async function resetUserPassword(
  targetUserId: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Not authenticated." };
    }

    const actorRole     = session.user.role;
    const actorSchoolId = session.user.schoolId;

    // Cannot self-reset through this action
    if (targetUserId === session.user.id) {
      return {
        success: false,
        error:
          "Use the Change Password form to update your own password.",
      };
    }

    // Fetch target
    const target = await prisma.user.findUnique({
      where:  { id: targetUserId },
      select: { id: true, role: true, schoolId: true, name: true },
    });
    if (!target) return { success: false, error: "User not found." };

    // ── Permission rules ─────────────────────────────────────────
    if (actorRole === "SUPER_ADMIN") {
      // SUPER_ADMIN can reset any user — no further checks needed
    } else if (actorRole === "SCHOOL_ADMIN") {
      // Must be in the same school
      if (target.schoolId !== actorSchoolId) {
        return {
          success: false,
          error:   "You can only reset passwords for users in your school.",
        };
      }
      // Cannot reset SUPER_ADMIN or fellow SCHOOL_ADMIN
      if (
        target.role === "SUPER_ADMIN" ||
        target.role === "SCHOOL_ADMIN"
      ) {
        return {
          success: false,
          error:
            "You do not have permission to reset this user's password.",
        };
      }
    } else {
      return {
        success: false,
        error:   "You do not have permission to reset passwords.",
      };
    }

    const hashed = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);
    await prisma.user.update({
      where: { id: targetUserId },
      data:  { password: hashed },
    });

    return { success: true };
  } catch (e) {
    console.error("[resetUserPassword]", e);
    return { success: false, error: "Failed to reset password." };
  }
}