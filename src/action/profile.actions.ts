"use server";

import { auth }                from "@/lib/auth";
import { prisma }              from "@/lib/db";
import { revalidatePath }      from "next/cache";
import { UpdateProfileSchema } from "@/lib/validations/profile";
import type { ActionResult }   from "@/types/actions";

export async function updateProfile(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated." };
    }

    const parsed = UpdateProfileSchema.safeParse({
      name:      formData.get("name"),
      phone:     formData.get("phone")     || undefined,
      avatarUrl: formData.get("avatarUrl") || undefined,
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, phone, avatarUrl } = parsed.data;

    await prisma.user.update({
      where: { id: session.user.id },
      data:  {
        name:      name.trim(),
        phone:     phone?.trim()     || null,
        avatarUrl: avatarUrl?.trim() || null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");       // refresh layout so topbar/sidebar updates
    return { success: true };
  } catch (e) {
    console.error("[updateProfile]", e);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}

export async function removeAvatar(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data:  { avatarUrl: null },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("[removeAvatar]", e);
    return { success: false, error: "Failed to remove avatar." };
  }
}
