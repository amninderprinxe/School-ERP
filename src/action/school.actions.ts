"use server";

import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { revalidatePath }     from "next/cache";
import {
  SchoolCreateSchema,
  SchoolUpdateSchema,
}                             from "@/lib/validations/school";
import type { ActionResult }  from "@/types/actions";
import { Prisma }             from "@prisma/client";

const REVALIDATE = "/super-admin/schools";

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────
export async function createSchool(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const parsed = SchoolCreateSchema.safeParse({
      name:    formData.get("name"),
      slug:    formData.get("slug"),
      email:   formData.get("email"),
      phone:   formData.get("phone"),
      address: formData.get("address"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, slug, email, phone, address } = parsed.data;

    await prisma.school.create({
      data: {
        name:    name.trim(),
        slug:    slug.trim().toLowerCase(),
        email:   email?.trim()   || null,
        phone:   phone?.trim()   || null,
        address: address?.trim() || null,
        status:  "ACTIVE",
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/super-admin");
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "A school with this slug already exists.",
        fieldErrors: { slug: ["Slug must be globally unique. Choose a different one."] },
      };
    }
    console.error("[createSchool]", e);
    return { success: false, error: "Failed to create school. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
export async function updateSchool(
  id:       string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "School not found." };

    const parsed = SchoolUpdateSchema.safeParse({
      name:    formData.get("name"),
      slug:    formData.get("slug"),
      email:   formData.get("email"),
      phone:   formData.get("phone"),
      address: formData.get("address"),
      status:  formData.get("status"),
    });

    if (!parsed.success) {
      return {
        success:     false,
        error:       "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, slug, email, phone, address, status } = parsed.data;

    await prisma.school.update({
      where: { id },
      data:  {
        name:    name.trim(),
        slug:    slug.trim().toLowerCase(),
        email:   email?.trim()   || null,
        phone:   phone?.trim()   || null,
        address: address?.trim() || null,
        status,
      },
    });

    revalidatePath(REVALIDATE);
    revalidatePath("/super-admin");
    return { success: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success:     false,
        error:       "A school with this slug already exists.",
        fieldErrors: { slug: ["Slug must be globally unique. Choose a different one."] },
      };
    }
    console.error("[updateSchool]", e);
    return { success: false, error: "Failed to update school." };
  }
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE STATUS  (ACTIVE ↔ SUSPENDED)
// ─────────────────────────────────────────────────────────────────
export async function toggleSchoolStatus(id: string): Promise<ActionResult> {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return { success: false, error: "School not found." };

    const newStatus =
      school.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    await prisma.school.update({
      where: { id },
      data:  { status: newStatus },
    });

    revalidatePath(REVALIDATE);
    return { success: true };
  } catch (e) {
    console.error("[toggleSchoolStatus]", e);
    return { success: false, error: "Failed to update school status." };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE  (cascades all school data)
// ─────────────────────────────────────────────────────────────────
export async function deleteSchool(id: string): Promise<ActionResult> {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return { success: false, error: "School not found." };

    // Cascade is defined in schema — this removes all related records
    await prisma.school.delete({ where: { id } });

    revalidatePath(REVALIDATE);
    revalidatePath("/super-admin");
    return { success: true };
  } catch (e) {
    console.error("[deleteSchool]", e);
    return { success: false, error: "Failed to delete school." };
  }
}