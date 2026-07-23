"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  SchoolCreateSchema,
  SchoolUpdateSchema,
} from "@/lib/validations/school";
import { logAction, AUDIT_ACTIONS } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

const REVALIDATE = "/super-admin/schools";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[school-audit-log]", error);
  }
}

function revalidateSchoolPages() {
  revalidatePath(REVALIDATE);
  revalidatePath("/super-admin");
}

// ─────────────────────────────────────────────────────────────────
// CREATE SCHOOL
// ─────────────────────────────────────────────────────────────────

export async function createSchool(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);

    const parsed = SchoolCreateSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      slug,
      email,
      phone,
      address,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanPhone = phone?.trim() || null;
    const cleanAddress = address?.trim() || null;

    const createdSchool = await prisma.school.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        status: true,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId: null,
      action: AUDIT_ACTIONS.CREATE_SCHOOL,
      entity: "School",
      entityId: createdSchool.id,
      entityName: createdSchool.name,
      metadata: {
        slug: createdSchool.slug,
        email: createdSchool.email,
        phone: createdSchool.phone,
        address: createdSchool.address,
        status: createdSchool.status,
      },
    });

    revalidateSchoolPages();

    return {
      success: true,
      message: "School created successfully.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A school with this slug already exists.",
        fieldErrors: {
          slug: [
            "Slug must be globally unique. Choose a different one.",
          ],
        },
      };
    }

    console.error("[createSchool]", error);

    return {
      success: false,
      error: "Failed to create school. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE SCHOOL
// ─────────────────────────────────────────────────────────────────

export async function updateSchool(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);

    const existing = await prisma.school.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        status: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "School not found.",
      };
    }

    const parsed = SchoolUpdateSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      slug,
      email,
      phone,
      address,
      status,
    } = parsed.data;

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanPhone = phone?.trim() || null;
    const cleanAddress = address?.trim() || null;

    const updatedSchool = await prisma.school.update({
      where: {
        id: existing.id,
      },
      data: {
        name: cleanName,
        slug: cleanSlug,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        status,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        status: true,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId: null,
      action: AUDIT_ACTIONS.UPDATE_SCHOOL,
      entity: "School",
      entityId: updatedSchool.id,
      entityName: updatedSchool.name,
      metadata: {
        slug: updatedSchool.slug,
        email: updatedSchool.email,
        phone: updatedSchool.phone,
        address: updatedSchool.address,
        status: updatedSchool.status,

        previousName: existing.name,
        previousSlug: existing.slug,
        previousEmail: existing.email,
        previousPhone: existing.phone,
        previousAddress: existing.address,
        previousStatus: existing.status,
      },
    });

    revalidateSchoolPages();

    return {
      success: true,
      message: "School updated successfully.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A school with this slug already exists.",
        fieldErrors: {
          slug: [
            "Slug must be globally unique. Choose a different one.",
          ],
        },
      };
    }

    console.error("[updateSchool]", error);

    return {
      success: false,
      error: "Failed to update school.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE SCHOOL STATUS
// ACTIVE ↔ SUSPENDED
// ─────────────────────────────────────────────────────────────────

export async function toggleSchoolStatus(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);

    const school = await prisma.school.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    if (!school) {
      return {
        success: false,
        error: "School not found.",
      };
    }

    const previousStatus = school.status;

    const newStatus =
      school.status === "ACTIVE"
        ? "SUSPENDED"
        : "ACTIVE";

    const updatedSchool = await prisma.school.update({
      where: {
        id: school.id,
      },
      data: {
        status: newStatus,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId: null,
      action: AUDIT_ACTIONS.TOGGLE_SCHOOL_STATUS,
      entity: "School",
      entityId: updatedSchool.id,
      entityName: updatedSchool.name,
      metadata: {
        slug: updatedSchool.slug,
        previousStatus,
        newStatus: updatedSchool.status,
      },
    });

    revalidateSchoolPages();

    return {
      success: true,
      message:
        updatedSchool.status === "ACTIVE"
          ? "School activated successfully."
          : "School suspended successfully.",
    };
  } catch (error) {
    console.error("[toggleSchoolStatus]", error);

    return {
      success: false,
      error: "Failed to update school status.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE SCHOOL
// Warning: all related school data may be deleted by cascade.
// ─────────────────────────────────────────────────────────────────

export async function deleteSchool(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);

    const school = await prisma.school.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        _count: {
          select: {
            users: true,
            classes: true,
            sections: true,
            subjects: true,
            announcements: true,
          },
        },
      },
    });

    if (!school) {
      return {
        success: false,
        error: "School not found.",
      };
    }

    /*
     * Audit log is created before deleting the school.
     *
     * Since schoolId is null for SUPER_ADMIN logs, the audit record
     * will not be removed by the school's cascade deletion.
     */
    await safelyLogAction({
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? "Unknown",
      schoolId: null,
      action: AUDIT_ACTIONS.DELETE_SCHOOL,
      entity: "School",
      entityId: school.id,
      entityName: school.name,
      metadata: {
        slug: school.slug,
        email: school.email,
        phone: school.phone,
        address: school.address,
        status: school.status,
        deletedRecordCounts: {
          users: school._count.users,
          classes: school._count.classes,
          sections: school._count.sections,
          subjects: school._count.subjects,
          announcements: school._count.announcements,
        },
      },
    });

    await prisma.school.delete({
      where: {
        id: school.id,
      },
    });

    revalidateSchoolPages();

    return {
      success: true,
      message: "School deleted successfully.",
    };
  } catch (error) {
    console.error("[deleteSchool]", error);

    return {
      success: false,
      error: "Failed to delete school.",
    };
  }
}
