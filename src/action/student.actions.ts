"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { generateStudentLoginId } from "@/lib/student-id-utils";
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
      parentName,
      parentEmail,
      parentPhone,
      relation,
      parentPassword,
    } = parsed.data;

    const studentEmail = email.trim().toLowerCase();
    const cleanParentEmail = parentEmail.trim().toLowerCase();
    const cleanRollNumber = rollNumber?.trim() || null;
    const cleanAdmissionNo = admissionNo?.trim() || null;

    /*
     * Student login ID generate karan layi section,
     * class name ate school code required ne.
     */
    if (!sectionId) {
      return {
        success: false,
        error: "Please select a section for the student.",
        fieldErrors: {
          sectionId: ["Section is required to generate Student ID."],
        },
      };
    }

    if (!cleanRollNumber) {
      return {
        success: false,
        error: "Please enter the student's roll number.",
        fieldErrors: {
          rollNumber: ["Roll number is required to generate Student ID."],
        },
      };
    }

    const school = await prisma.school.findUnique({
      where: {
        id: schoolId,
      },
      select: {
        id: true,
        code: true,
      },
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

    const loginId = generateStudentLoginId({
      schoolCode: school.code,
      className: selectedSection.class.name,
      sectionName: selectedSection.name,
      rollNumber: cleanRollNumber,
    });

    /*
     * Same section ch same roll number duplicate nahi hona chahida.
     */
    const duplicateRollNumber = await prisma.studentProfile.findFirst({
      where: {
        sectionId: selectedSection.id,
        rollNumber: cleanRollNumber,
      },
      select: {
        id: true,
      },
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

    /*
     * Generated Student ID globally unique hona chahida.
     */
    const duplicateLoginId = await prisma.user.findUnique({
      where: {
        loginId,
      },
      select: {
        id: true,
      },
    });

    if (duplicateLoginId) {
      return {
        success: false,
        error: `Student ID ${loginId} is already assigned.`,
        fieldErrors: {
          rollNumber: [
            "This roll number generates a Student ID that already exists.",
          ],
        },
      };
    }

    const studentHashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const finalParentPassword =
      parentPassword && parentPassword.trim().length > 0
        ? parentPassword.trim()
        : DEFAULT_PASSWORD;

    const parentHashedPassword = await bcrypt.hash(
      finalParentPassword,
      10,
    );

    await prisma.$transaction(async (tx) => {
      const studentUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: studentEmail,
          loginId,
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
              dateOfBirth: dateOfBirth
                ? new Date(dateOfBirth)
                : null,
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

      const existingParentUser = await tx.user.findFirst({
        where: {
          email: cleanParentEmail,
          role: "PARENT",
          schoolId,
        },
        include: {
          parentProfile: true,
        },
      });

      let parentUser = existingParentUser;

      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            name: parentName.trim(),
            email: cleanParentEmail,
            password: parentHashedPassword,
            role: "PARENT",
            phone: parentPhone?.trim() || null,
            schoolId,
            isActive: true,

            parentProfile: {
              create: {
                phone: parentPhone?.trim() || null,
              },
            },
          },
          include: {
            parentProfile: true,
          },
        });
      }

      let parentProfile = parentUser.parentProfile;

      if (!parentProfile) {
        parentProfile = await tx.parentProfile.create({
          data: {
            userId: parentUser.id,
            phone: parentPhone?.trim() || null,
          },
        });
      }

      const existingRelation = await tx.parentStudent.findFirst({
        where: {
          parentProfileId: parentProfile.id,
          studentProfileId: studentUser.studentProfile.id,
        },
      });

      if (!existingRelation) {
        await tx.parentStudent.create({
          data: {
            parentProfileId: parentProfile.id,
            studentProfileId: studentUser.studentProfile.id,
            relation: relation.trim(),
          },
        });
      }
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message: `Student created successfully. Student ID: ${loginId}. Default password: ${DEFAULT_PASSWORD}`,
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
          error: "The generated Student ID already exists.",
          fieldErrors: {
            rollNumber: [
              "This class, section and roll number combination already exists.",
            ],
          },
        };
      }

      if (target.includes("email")) {
        return {
          success: false,
          error: "A user with this email already exists.",
          fieldErrors: {
            email: [
              "Student email or parent email is already registered.",
            ],
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

    /*
     * Old login ID default rakhni aa.
     * Sirf new section ate roll number available hon te regenerate hovegi.
     */
    let updatedLoginId = existingStudent.loginId;

    if (cleanSectionId && cleanRollNumber) {
      const school = await prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          code: true,
        },
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
          error: "Please assign a school code before updating students.",
        };
      }

      const selectedSection = await prisma.section.findFirst({
        where: {
          id: cleanSectionId,
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

      const generatedLoginId = generateStudentLoginId({
        schoolCode: school.code,
        className: selectedSection.class.name,
        sectionName: selectedSection.name,
        rollNumber: cleanRollNumber,
      });

      const duplicateRollNumber =
        await prisma.studentProfile.findFirst({
          where: {
            sectionId: selectedSection.id,
            rollNumber: cleanRollNumber,
            NOT: {
              id: existingStudent.studentProfile.id,
            },
          },
          select: {
            id: true,
          },
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

      const duplicateLoginId = await prisma.user.findFirst({
        where: {
          loginId: generatedLoginId,
          NOT: {
            id: existingStudent.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateLoginId) {
        return {
          success: false,
          error: `Student ID ${generatedLoginId} is already assigned.`,
          fieldErrors: {
            rollNumber: [
              "This class, section and roll number combination already exists.",
            ],
          },
        };
      }

      updatedLoginId = generatedLoginId;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: existingStudent.id,
        },
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          loginId: updatedLoginId,
          gender: parseGender(gender),
          phone: phone?.trim() || null,
        },
      });

      await tx.studentProfile.update({
        where: {
          id: existingStudent.studentProfile.id,
        },
        data: {
          rollNumber: cleanRollNumber,
          admissionNo: admissionNo?.trim() || null,
          dateOfBirth: dateOfBirth
            ? new Date(dateOfBirth)
            : null,
          bloodGroup: bloodGroup?.trim() || null,
          sectionId: cleanSectionId,
        },
      });
    });

    revalidatePath(REVALIDATE);

    return {
      success: true,
      message:
        updatedLoginId !== existingStudent.loginId
          ? `Student updated successfully. New Student ID: ${updatedLoginId}`
          : "Student updated successfully.",
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
          error: "The generated Student ID already exists.",
          fieldErrors: {
            rollNumber: [
              "This class, section and roll number combination already exists.",
            ],
          },
        };
      }

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

export async function deleteStudent(
  id: string,
): Promise<ActionResult> {
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
