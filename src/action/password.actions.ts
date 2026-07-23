"use server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChangePasswordSchema } from "@/lib/validations/password";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

const DEFAULT_RESET_PASSWORD = "Password@123";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[password-audit-log]", error);
  }
}

async function getActor(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      schoolId: true,
      password: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// CHANGE OWN PASSWORD
// Any authenticated user
// ─────────────────────────────────────────────────────────────────

export async function changePassword(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error:
          "You must be logged in to change your password.",
      };
    }

    const parsed = ChangePasswordSchema.safeParse({
      currentPassword: formData.get(
        "currentPassword",
      ),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get(
        "confirmPassword",
      ),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors:
          parsed.error.flatten().fieldErrors,
      };
    }

    const {
      currentPassword,
      newPassword,
    } = parsed.data;

    const user = await getActor(session.user.id);

    if (!user) {
      return {
        success: false,
        error: "User not found.",
      };
    }

    const isCurrentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.password,
      );

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          currentPassword: [
            "Current password is incorrect.",
          ],
        },
      };
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password,
    );

    if (isSamePassword) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          newPassword: [
            "New password must be different from your current password.",
          ],
        },
      };
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10,
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId: user.schoolId,
      action: AUDIT_ACTIONS.CHANGE_PASSWORD,
      entity: "User",
      entityId: user.id,
      entityName: user.name ?? "Unknown User",
      metadata: {
        changedOwnPassword: true,
      },
    });

    return {
      success: true,
      message: "Password changed successfully.",
    };
  } catch (error) {
    console.error("[changePassword]", error);

    return {
      success: false,
      error:
        "Failed to change password. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// RESET ANOTHER USER'S PASSWORD
// SUPER_ADMIN or SCHOOL_ADMIN
// ─────────────────────────────────────────────────────────────────

export async function resetUserPassword(
  targetUserId: string,
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Not authenticated.",
      };
    }

    const actor = await getActor(session.user.id);

    if (!actor) {
      return {
        success: false,
        error: "Authenticated user not found.",
      };
    }

    if (targetUserId === actor.id) {
      return {
        success: false,
        error:
          "Use the Change Password form to update your own password.",
      };
    }

    const target = await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        loginId: true,
        role: true,
        schoolId: true,
      },
    });

    if (!target) {
      return {
        success: false,
        error: "User not found.",
      };
    }

    // ── Permission rules ─────────────────────────────────────────

    if (actor.role === "SUPER_ADMIN") {
      // SUPER_ADMIN can reset any other user's password.
    } else if (actor.role === "SCHOOL_ADMIN") {
      if (!actor.schoolId) {
        return {
          success: false,
          error:
            "No school is assigned to your account.",
        };
      }

      if (target.schoolId !== actor.schoolId) {
        return {
          success: false,
          error:
            "You can only reset passwords for users in your school.",
        };
      }

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
        error:
          "You do not have permission to reset passwords.",
      };
    }

    const hashedPassword = await bcrypt.hash(
      DEFAULT_RESET_PASSWORD,
      10,
    );

    await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    await safelyLogAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.name ?? "Unknown",
      schoolId:
        actor.role === "SUPER_ADMIN"
          ? null
          : actor.schoolId,
      action: AUDIT_ACTIONS.RESET_PASSWORD,
      entity: "User",
      entityId: target.id,
      entityName:
        target.name ?? "Unknown User",
      metadata: {
        targetRole: target.role,
        targetSchoolId: target.schoolId,
        targetEmail: target.email,
        targetLoginId: target.loginId,
        resetToDefaultPassword: true,
      },
    });

    return {
      success: true,
      message:
        "Password reset successfully to the default password.",
    };
  } catch (error) {
    console.error("[resetUserPassword]", error);

    return {
      success: false,
      error: "Failed to reset password.",
    };
  }
}
