"use server";

import bcrypt from "bcryptjs";
import type { Gender } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import type {
  ImportResult,
  StudentImportRow,
  TeacherImportRow,
} from "@/lib/validations/import";
import { sendEmail } from "@/lib/email";
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

async function getSchoolId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  return user?.schoolId ?? null;
}

async function safelyLogAction(data: Parameters<typeof logAction>[0]) {
  try {
    await logAction(data);
  } catch (error) {
    console.error("[import-audit-log]", error);
  }
}

function toGender(value?: string): Gender | null {
  const normalizedValue = value?.toUpperCase().trim() ?? "";

  if (
    normalizedValue === "MALE" ||
    normalizedValue === "FEMALE" ||
    normalizedValue === "OTHER"
  ) {
    return normalizedValue as Gender;
  }

  return null;
}

function toDateOrNull(value?: string): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
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

async function sendWelcomeEmailSafe(
  email: string | null,
  data: {
    schoolName: string;
    recipientName: string;
    loginId: string;
    password: string;
    role: string;
    loginUrl: string;
  }
) {
  if (!email || !email.trim()) {
    return;
  }

  try {
    if (typeof sendEmail === "function") {
      await sendEmail({
        to: email.trim(),
        subject: `Welcome to ${data.schoolName} - Your Campus-X Login Details`,
        html: `
          <p>Dear ${data.recipientName},</p>
          <p>Your account for <strong>${data.schoolName}</strong> is ready.</p>
          <p><strong>Login ID:</strong> ${data.loginId}</p>
          <p><strong>Password:</strong> ${data.password}</p>
          <p><a href="${data.loginUrl}">Click here to login</a></p>
        `,
      });
    }
  } catch (err) {
    console.error(`[welcome-email] Failed to send email to ${email}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────
// IMPORT STUDENTS
// ─────────────────────────────────────────────────────────────────

export async function importStudents(
  rows: (StudentImportRow & {
    fatherName?: string;
    motherName?: string;
    studentId?: string | number;
    studentCode?: string | number;
  })[],
): Promise<ImportActionResult> {
  try {
    const currentUser = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(currentUser.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
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
        error: "Maximum 500 rows per import.",
      };
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
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
        error: "Please assign a school code before importing students.",
      };
    }

    const schoolPrefix = school.code.trim().toUpperCase();
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const sectionCache = new Map<string, SectionCacheValue>();

    // Initialize sequential counter
    let currentStudentCount = await prisma.studentProfile.count({
      where: { user: { schoolId } },
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      const rowNumber = index + 2;

      try {
        const name = row.name?.trim();
        const rawEmail = row.email?.trim() ? row.email.trim().toLowerCase() : null;
        const className = row.className?.trim();
        const sectionName = row.sectionName?.trim();
        const rollNumber = row.rollNumber ? String(row.rollNumber).trim() : "";
        const admissionNo = row.admissionNo ? String(row.admissionNo).trim() : "";
        const fatherName = row.fatherName?.trim() || null;
        const motherName = row.motherName?.trim() || null;
        
        // Extract studentCode from CSV (studentId or studentCode column)
        const rawStudentCode = row.studentId ?? row.studentCode;
        const studentCode = rawStudentCode ? String(rawStudentCode).trim() : null;

        if (!name) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: "Student name is required.",
          });
          continue;
        }

        if (!className) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: "Class name is required.",
          });
          continue;
        }

        if (!sectionName) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: "Section name is required.",
          });
          continue;
        }

        if (!rollNumber) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: "Roll number is required.",
          });
          continue;
        }

        // Check duplicate email if provided
        if (rawEmail) {
          const existingEmail = await prisma.user.findUnique({
            where: { email: rawEmail },
            select: { id: true },
          });

          if (existingEmail) {
            result.skipped++;
            result.errors.push({
              row: rowNumber,
              email: rawEmail,
              reason: "Email already exists — skipped.",
            });
            continue;
          }
        }

        // Section & Class cache lookup
        const cacheKey = `${className}|${sectionName}`.toUpperCase();
        let selectedSection = sectionCache.get(cacheKey);

        if (!sectionCache.has(cacheKey)) {
          const section = await prisma.section.findFirst({
            where: {
              schoolId,
              name: { equals: sectionName },
              class: {
                name: { equals: className },
                schoolId,
              },
            },
            select: {
              id: true,
              name: true,
              class: {
                select: { name: true },
              },
            },
          });

          selectedSection = section
            ? {
                id: section.id,
                name: section.name,
                className: section.class.name,
              }
            : null;

          sectionCache.set(cacheKey, selectedSection);
        }

        if (!selectedSection) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: `Class "${className}" with section "${sectionName}" was not found in this school.`,
          });
          continue;
        }

        // Verify section roll number uniqueness
        const duplicateRollNumber = await prisma.studentProfile.findFirst({
          where: {
            sectionId: selectedSection.id,
            rollNumber,
          },
          select: { id: true },
        });

        if (duplicateRollNumber) {
          result.skipped++;
          result.errors.push({
            row: rowNumber,
            email: rawEmail || "",
            reason: `Roll number ${rollNumber} already exists in ${className}-${sectionName}.`,
          });
          continue;
        }

        // Generate next sequential permanent Login ID (e.g. KRD-0001)
        currentStudentCount++;
        let loginId = `${schoolPrefix}-${String(currentStudentCount).padStart(4, "0")}`;

        while (await prisma.user.findUnique({ where: { loginId } })) {
          currentStudentCount++;
          loginId = `${schoolPrefix}-${String(currentStudentCount).padStart(4, "0")}`;
        }

        // Create User & StudentProfile
        await prisma.user.create({
          data: {
            name,
            email: rawEmail,
            loginId,
            password: hashedPassword,
            role: "STUDENT",
            gender: toGender(row.gender),
            phone: row.phone ? String(row.phone).trim() : null,
            schoolId,
            isActive: true,
            studentProfile: {
              create: {
                studentCode, // Official Student ID (e.g. 12615189)
                rollNumber,
                admissionNo: admissionNo || null,
                dateOfBirth: toDateOrNull(row.dateOfBirth),
                bloodGroup: row.bloodGroup?.trim() || null,
                fatherName,
                motherName,
                sectionId: selectedSection.id,
              },
            },
          },
        });

        // Dispatch welcome email only if email is present
        if (rawEmail) {
          sendWelcomeEmailSafe(rawEmail, {
            schoolName: school.name,
            recipientName: name,
            loginId,
            password: DEFAULT_PASSWORD,
            role: "STUDENT",
            loginUrl,
          });
        }

        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: row.email || "",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName: currentUser.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.IMPORT_STUDENTS,
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
    console.error("[importStudents]", error);
    return {
      success: false,
      error: "Import failed. Please try again.",
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
    const currentUser = await requireRole(["SCHOOL_ADMIN"]);
    const schoolId = await getSchoolId(currentUser.id);

    if (!schoolId) {
      return {
        success: false,
        error: "No school assigned to your account.",
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
        error: "Maximum 500 rows per import.",
      };
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
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

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      const rowNumber = index + 2;

      try {
        const name = row.name?.trim();
        const email = row.email?.trim().toLowerCase();

        if (!name) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: email || "",
            reason: "Teacher name is required.",
          });
          continue;
        }

        if (!email) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: "",
            reason: "Teacher email is required.",
          });
          continue;
        }

        const existingEmail = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (existingEmail) {
          result.skipped++;
          result.errors.push({
            row: rowNumber,
            email,
            reason: "Email already exists — skipped.",
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
            phone: row.phone ? String(row.phone).trim() : null,
            schoolId,
            isActive: true,
            teacherProfile: {
              create: {
                employeeCode: row.employeeCode?.trim() || null,
                qualification: row.qualification?.trim() || null,
                joiningDate: toDateOrNull(row.joiningDate),
              },
            },
          },
        });

        sendWelcomeEmailSafe(email, {
          schoolName: school.name,
          recipientName: name,
          loginId: email,
          password: DEFAULT_PASSWORD,
          role: "TEACHER",
          loginUrl,
        });

        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: row.email || "",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await safelyLogAction({
      userId: currentUser.id,
      userRole: currentUser.role,
      userName: currentUser.name ?? "Unknown",
      schoolId,
      action: AUDIT_ACTIONS.IMPORT_TEACHERS,
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
    console.error("[importTeachers]", error);
    return {
      success: false,
      error: "Import failed. Please try again.",
    };
  }
}