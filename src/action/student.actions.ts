"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  CreateStudentSchema,
  UpdateStudentSchema,
} from "@/lib/validations/student";
import type { ActionResult } from "@/types/actions";

const DEFAULT_PASSWORD = "Password@123";
const REVALIDATE = "/school-admin/students";

function parseGender(value?: string) {
  if (value === "MALE" || value === "FEMALE" || value === "OTHER") {
    return value;
  }
  return null;
}

function getUniqueConstraintTarget(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.join(",");
  }
  return typeof target === "string" ? target : "";
}

/**
 * Helper: Generates sequential permanent Student ID (e.g. KRD-0001, KRD-0002)
 */
async function generateSequentialStudentId(
  tx: Prisma.TransactionClient,
  schoolId: string,
  schoolCode: string
): Promise<string> {
  const prefix = schoolCode.trim().toUpperCase();

  // Count total students registered under this school
  const count = await tx.studentProfile.count({
    where: {
      user: { schoolId },
    },
  });

  let nextNumber = count + 1;
  let candidateId = `${prefix}-${String(nextNumber).padStart(4, "0")}`;

  // Check and increment if any collision exists (e.g., due to deleted records)
  while (await tx.user.findUnique({ where: { loginId: candidateId } })) {
    nextNumber += 1;
    candidateId = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
  }

  return candidateId;
}

// ============================================================
// CREATE STUDENT
// ============================================================

export async function createStudent(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = currentUser.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school is assigned to your account.",
      };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = CreateStudentSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      email,
      gender,
      phone,
      rollNumber,
      admissionNo,
      dateOfBirth,
      bloodGroup,
      sectionId,
    } = parsed.data;

    const studentEmail = email.trim().toLowerCase();
    const cleanRollNumber = rollNumber?.trim() || null;
    const cleanAdmissionNo = admissionNo?.trim() || null;

    if (!sectionId) {
      return {
        success: false,
        error: "Please select a section for the student.",
        fieldErrors: {
          sectionId: ["Section is required for student enrollment."],
        },
      };
    }

    if (!cleanRollNumber) {
      return {
        success: false,
        error: "Please enter the student's roll number.",
        fieldErrors: {
          rollNumber: ["Roll number is required."],
        },
      };
    }

    // 1. Fetch School & Verify School Code
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, code: true },
    });

    if (!school) {
      return {
        success: false,
        error: "School not found.",
      };
    }

    if (!school.code?.trim()) {
      return {
        success: false,
        error: "Please assign a school code before creating students.",
      };
    }

    // 2. Validate Section
    const selectedSection = await prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!selectedSection) {
      return {
        success: false,
        error: "Selected section does not belong to your school.",
        fieldErrors: {
          sectionId: ["Invalid section selected."],
        },
      };
    }

    // 3. Prevent duplicate roll number inside the same section
    const duplicateRollNumber = await prisma.studentProfile.findFirst({
      where: {
        sectionId: selectedSection.id,
        rollNumber: cleanRollNumber,
      },
      select: { id: true },
    });

    if (duplicateRollNumber) {
      return {
        success: false,
        error: "This roll number is already assigned in the selected section.",
        fieldErrors: {
          rollNumber: [
            "A student with this roll number already exists in this section.",
          ],
        },
      };
    }

    const studentHashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    let generatedLoginId = "";

    // 4. Atomic Transaction: Generate Sequential ID & Create Records
    await prisma.$transaction(async (tx) => {
      generatedLoginId = await generateSequentialStudentId(
        tx,
        schoolId,
        school.code!
      );

      const studentUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: studentEmail,
          loginId: generatedLoginId,
          password: studentHashedPassword,
          role: "STUDENT",
          gender: parseGender(gender),
          phone: phone?.trim() || null,
          schoolId,
          isActive: true,
          studentProfile: {
            create: {
              rollNumber: cleanRollNumber,
              admissionNo: cleanAdmissionNo,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              bloodGroup: bloodGroup?.trim() || null,
              sectionId: selectedSection.id,
            },
          },
        },
        include: {
          studentProfile: true,
        },
      });

      if (!studentUser.studentProfile) {
        throw new Error("Student profile was not created.");
      }
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message: `Student created successfully. Permanent Student ID: ${generatedLoginId} | Default Password: ${DEFAULT_PASSWORD}`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = getUniqueConstraintTarget(error);

      if (target.includes("loginId")) {
        return {
          success: false,
          error: "The generated Student ID already exists. Please try again.",
        };
      }

      if (target.includes("email")) {
        return {
          success: false,
          error: "A user with this email already exists.",
          fieldErrors: {
            email: ["Student email is already registered."],
          },
        };
      }

      if (
        target.includes("sectionId") &&
        target.includes("rollNumber")
      ) {
        return {
          success: false,
          error:
            "This roll number is already assigned in the selected section.",
          fieldErrors: {
            rollNumber: [
              "Choose a different roll number for this section.",
            ],
          },
        };
      }

      return {
        success: false,
        error: "A record with the same unique details already exists.",
      };
    }

    console.error("[createStudent]", error);

    return {
      success: false,
      error: "Failed to create student. Please try again.",
    };
  }
}

// ============================================================
// UPDATE STUDENT
// ============================================================

export async function updateStudent(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = currentUser.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school is assigned to your account.",
      };
    }

    const existingStudent = await prisma.user.findFirst({
      where: {
        id,
        schoolId,
        role: "STUDENT",
      },
      select: {
        id: true,
        loginId: true,
        studentProfile: {
          select: {
            id: true,
            sectionId: true,
            rollNumber: true,
          },
        },
      },
    });

    if (!existingStudent || !existingStudent.studentProfile) {
      return {
        success: false,
        error: "Student not found.",
      };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = UpdateStudentSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      email,
      gender,
      phone,
      rollNumber,
      admissionNo,
      dateOfBirth,
      bloodGroup,
      sectionId,
    } = parsed.data;

    const cleanRollNumber = rollNumber?.trim() || null;
    const cleanSectionId = sectionId || null;

    // Validate section if updated
    if (cleanSectionId) {
      const selectedSection = await prisma.section.findFirst({
        where: {
          id: cleanSectionId,
          schoolId,
        },
        select: { id: true },
      });

      if (!selectedSection) {
        return {
          success: false,
          error: "Selected section does not belong to your school.",
          fieldErrors: {
            sectionId: ["Invalid section selected."],
          },
        };
      }

      // Prevent duplicate roll number in new/current section
      if (cleanRollNumber) {
        const duplicateRollNumber = await prisma.studentProfile.findFirst({
          where: {
            sectionId: cleanSectionId,
            rollNumber: cleanRollNumber,
            NOT: {
              id: existingStudent.studentProfile.id,
            },
          },
          select: { id: true },
        });

        if (duplicateRollNumber) {
          return {
            success: false,
            error:
              "This roll number is already assigned in the selected section.",
            fieldErrors: {
              rollNumber: [
                "Choose a different roll number for this section.",
              ],
            },
          };
        }
      }
    }

    // 🔒 Permanent Identity Rule: loginId remains untouched on updates!
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingStudent.id },
        data: {
          name: name?.trim(),
          email: email?.trim().toLowerCase(),
          gender: parseGender(gender),
          phone: phone?.trim() || null,
        },
      });

      await tx.studentProfile.update({
        where: { id: existingStudent.studentProfile?.id },
        data: {
          rollNumber: cleanRollNumber,
          admissionNo: admissionNo?.trim() || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bloodGroup: bloodGroup?.trim() || null,
          sectionId: cleanSectionId,
        },
      });
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message: "Student updated successfully.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = getUniqueConstraintTarget(error);

      if (target.includes("email")) {
        return {
          success: false,
          error: "A user with this email already exists.",
          fieldErrors: {
            email: ["Email is already registered."],
          },
        };
      }

      if (
        target.includes("sectionId") &&
        target.includes("rollNumber")
      ) {
        return {
          success: false,
          error:
            "This roll number is already assigned in the selected section.",
          fieldErrors: {
            rollNumber: [
              "Choose a different roll number for this section.",
            ],
          },
        };
      }

      return {
        success: false,
        error: "A record with the same unique details already exists.",
      };
    }

    console.error("[updateStudent]", error);

    return {
      success: false,
      error: "Failed to update student.",
    };
  }
}

// ============================================================
// DELETE STUDENT
// ============================================================

export async function deleteStudent(id: string): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = currentUser.schoolId;

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned.",
      };
    }

    const existingStudent = await prisma.user.findFirst({
      where: {
        id,
        schoolId,
        role: "STUDENT",
      },
      select: {
        id: true,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        error: "Student not found.",
      };
    }

    await prisma.user.delete({
      where: {
        id: existingStudent.id,
      },
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message: "Student deleted successfully.",
    };
  } catch (error) {
    console.error("[deleteStudent]", error);

    return {
      success: false,
      error: "Failed to delete student.",
    };
  }
}