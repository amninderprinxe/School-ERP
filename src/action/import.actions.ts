"use server";

import bcrypt from "bcryptjs";
import type { Gender } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { generateStudentLoginId } from "@/lib/student-id-utils";
import type {
  ImportResult,
  StudentImportRow,
  TeacherImportRow,
} from "@/lib/validations/import";
import { sendWelcomeEmail } from "@/lib/email";

import {
  logAction,
  AUDIT_ACTIONS,
} from "@/lib/audit";

type ImportActionResult =
  | {
    success: true;
    data: ImportResult;
  }
  | {
    success: false;
    error: string;
  };

type SectionCacheValue = {
  id: string;
  name: string;
  className: string;
} | null;

const DEFAULT_PASSWORD = "Password@123";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

// Fetch current schoolId directly from database.
async function getSchoolId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      schoolId: true,
    },
  });

  return user?.schoolId ?? null;
}

// Audit logging failure should not fail the import operation.
async function safelyLogAction(
  data: Parameters<typeof logAction>[0],
) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[import-audit-log]", error);
  }
}

function toGender(value: string): Gender | null {
  const normalizedValue =
    value?.toUpperCase().trim() ?? "";

  if (
    normalizedValue === "MALE" ||
    normalizedValue === "FEMALE" ||
    normalizedValue === "OTHER"
  ) {
    return normalizedValue;
  }

  return null;
}

function toDateOrNull(
  value: string,
): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(
    `${value.trim()}T00:00:00.000Z`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function revalidateStudentImportPages() {
  revalidatePath("/school-admin/students");
  revalidatePath("/school-admin/import");
  revalidatePath("/school-admin");
}

function revalidateTeacherImportPages() {
  revalidatePath("/school-admin/teachers");
  revalidatePath("/school-admin/import");
  revalidatePath("/school-admin");
}

// ─────────────────────────────────────────────────────────────────
// IMPORT STUDENTS
// ─────────────────────────────────────────────────────────────────


export async function importStudents(
  rows: StudentImportRow[],
): Promise<ImportActionResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error:
          "No school assigned to your account.",
      };
    }

    if (!rows.length) {
      return {
        success: false,
        error: "No rows to import.",
      };
    }

    if (rows.length > 500) {
      return {
        success: false,
        error:
          "Maximum 500 rows per import.",
      };
    }

    const school =
      await prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          id: true,
          name: true,
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
        error:
          "Please assign a school code before importing students.",
      };
    }

    const hashedPassword =
      await bcrypt.hash(
        DEFAULT_PASSWORD,
        10,
      );

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    /*
     * Cache example:
     * "GRADE 10|A" → section data
     */
    const sectionCache = new Map<
      string,
      SectionCacheValue
    >();

    for (
      let index = 0;
      index < rows.length;
      index++
    ) {
      const row = rows[index]!;
      const rowNumber = index + 2;

      try {
        const name = row.name.trim();
        const email = row.email
          .trim()
          .toLowerCase();

        const className =
          row.className.trim();

        const sectionName =
          row.sectionName.trim();

        const rollNumber =
          row.rollNumber?.trim() ?? "";

        const admissionNo =
          row.admissionNo?.trim() ?? "";

        if (!name) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Student name is required.",
          });

          continue;
        }

        if (!email) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email: "",
            reason:
              "Student email is required.",
          });

          continue;
        }

        if (!className) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Class name is required.",
          });

          continue;
        }

        if (!sectionName) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Section name is required.",
          });

          continue;
        }

        if (!rollNumber) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Roll number is required to generate Student ID.",
          });

          continue;
        }

        /*
         * User.email is globally unique.
         */
        const existingEmail =
          await prisma.user.findUnique({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });

        if (existingEmail) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Email already exists — skipped.",
          });

          continue;
        }

        /*
         * Resolve section and its class.
         */
        const cacheKey =
          `${className}|${sectionName}`.toUpperCase();

        let selectedSection =
          sectionCache.get(cacheKey);

        if (!sectionCache.has(cacheKey)) {
          const section =
            await prisma.section.findFirst({
              where: {
                schoolId,
                name: sectionName,
                class: {
                  name: className,
                  schoolId,
                },
              },
              select: {
                id: true,
                name: true,
                class: {
                  select: {
                    name: true,
                  },
                },
              },
            });

          selectedSection = section
            ? {
              id: section.id,
              name: section.name,
              className:
                section.class.name,
            }
            : null;

          sectionCache.set(
            cacheKey,
            selectedSection,
          );
        }

        if (!selectedSection) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              `Class "${className}" with section ` +
              `"${sectionName}" was not found in this school.`,
          });

          continue;
        }

        /*
         * Generate Student ID automatically.
         *
         * Example:
         * 4S + Grade 10 + A + 15
         * → 4S-10A-015
         */
        const loginId =
          generateStudentLoginId({
            schoolCode: school.code,
            className:
              selectedSection.className,
            sectionName:
              selectedSection.name,
            rollNumber,
          });

        /*
         * Same section cannot contain
         * duplicate roll numbers.
         */
        const duplicateRollNumber =
          await prisma.studentProfile.findFirst(
            {
              where: {
                sectionId:
                  selectedSection.id,
                rollNumber,
              },
              select: {
                id: true,
              },
            },
          );

        if (duplicateRollNumber) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              `Roll number ${rollNumber} already exists in ` +
              `${className}-${sectionName}.`,
          });

          continue;
        }

        /*
         * Generated login ID must be
         * globally unique.
         */
        const duplicateLoginId =
          await prisma.user.findUnique({
            where: {
              loginId,
            },
            select: {
              id: true,
            },
          });

        if (duplicateLoginId) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              `Student ID ${loginId} already exists.`,
          });

          continue;
        }

        await prisma.user.create({
          data: {
            name,
            email,
            loginId,
            password: hashedPassword,
            role: "STUDENT",
            gender: toGender(row.gender),
            phone:
              row.phone?.trim() || null,
            schoolId,
            isActive: true,

            studentProfile: {
              create: {
                rollNumber,
                admissionNo:
                  admissionNo || null,
                dateOfBirth:
                  toDateOrNull(
                    row.dateOfBirth,
                  ),
                bloodGroup:
                  row.bloodGroup?.trim() ||
                  null,
                sectionId:
                  selectedSection.id,
              },
            },
          },
        });

        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
        sendWelcomeEmail(email, {
          schoolName: "your school", // fetch school name before loop for efficiency
          studentName: row.name.trim(),
          email,
          password: DEFAULT_PASSWORD,
          role: "STUDENT",
          loginUrl,
        });

        result.imported++;
      } catch (error) {
        result.failed++;

        result.errors.push({
          row: rowNumber,
          email: row.email,
          reason:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.IMPORT_STUDENTS,
      entity: "StudentImport",
      entityId: school.id,
      entityName: "Student Import",
      metadata: {
        schoolName: school.name,
        schoolCode: school.code,
        totalRows: rows.length,
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
      },
    });

    revalidateStudentImportPages();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "[importStudents]",
      error,
    );

    return {
      success: false,
      error:
        "Import failed. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// IMPORT TEACHERS
// ─────────────────────────────────────────────────────────────────

export async function importTeachers(
  rows: TeacherImportRow[],
): Promise<ImportActionResult> {
  try {
    const currentUser = await requireRole([
      "SCHOOL_ADMIN",
    ]);

    const schoolId = await getSchoolId(
      currentUser.id,
    );

    if (!schoolId) {
      return {
        success: false,
        error:
          "No school assigned to your account.",
      };
    }

    if (!rows.length) {
      return {
        success: false,
        error: "No rows to import.",
      };
    }

    if (rows.length > 500) {
      return {
        success: false,
        error:
          "Maximum 500 rows per import.",
      };
    }

    const school =
      await prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

    if (!school) {
      return {
        success: false,
        error: "School not found.",
      };
    }

    const hashedPassword =
      await bcrypt.hash(
        DEFAULT_PASSWORD,
        10,
      );

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (
      let index = 0;
      index < rows.length;
      index++
    ) {
      const row = rows[index]!;
      const rowNumber = index + 2;

      try {
        const name = row.name.trim();
        const email = row.email
          .trim()
          .toLowerCase();

        if (!name) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Teacher name is required.",
          });

          continue;
        }

        if (!email) {
          result.failed++;

          result.errors.push({
            row: rowNumber,
            email: "",
            reason:
              "Teacher email is required.",
          });

          continue;
        }

        const existingEmail =
          await prisma.user.findUnique({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });

        if (existingEmail) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            email,
            reason:
              "Email already exists — skipped.",
          });

          continue;
        }

        await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "TEACHER",
            gender: toGender(row.gender),
            phone:
              row.phone?.trim() || null,
            schoolId,
            isActive: true,

            teacherProfile: {
              create: {
                employeeCode:
                  row.employeeCode?.trim() ||
                  null,
                qualification:
                  row.qualification?.trim() ||
                  null,
                joiningDate:
                  toDateOrNull(
                    row.joiningDate,
                  ),
              },
            },
          },
        });

        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
        sendWelcomeEmail(email, {
          schoolName: "your school", // fetch school name before loop for efficiency
          studentName: row.name.trim(),
          email,
          password: DEFAULT_PASSWORD,
          role: "TEACHER",
          loginUrl,
        });

        result.imported++;
      } catch (error) {
        result.failed++;

        result.errors.push({
          row: rowNumber,
          email: row.email,
          reason:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName:
        currentUser.name ?? "Unknown",
      schoolId,
      action:
        AUDIT_ACTIONS.IMPORT_TEACHERS,
      entity: "TeacherImport",
      entityId: school.id,
      entityName: "Teacher Import",
      metadata: {
        schoolName: school.name,
        schoolCode: school.code,
        totalRows: rows.length,
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
      },
    });

    revalidateTeacherImportPages();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "[importTeachers]",
      error,
    );

    return {
      success: false,
      error:
        "Import failed. Please try again.",
    };
  }
}
