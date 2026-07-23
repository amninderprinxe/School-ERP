import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────
// ACTION CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Students
  CREATE_STUDENT: "CREATE_STUDENT",
  UPDATE_STUDENT: "UPDATE_STUDENT",
  DELETE_STUDENT: "DELETE_STUDENT",

  // Teachers
  CREATE_TEACHER: "CREATE_TEACHER",
  UPDATE_TEACHER: "UPDATE_TEACHER",
  DELETE_TEACHER: "DELETE_TEACHER",

  // Classes
  CREATE_CLASS: "CREATE_CLASS",
  UPDATE_CLASS: "UPDATE_CLASS",
  DELETE_CLASS: "DELETE_CLASS",

  // Sections
  CREATE_SECTION: "CREATE_SECTION",
  UPDATE_SECTION: "UPDATE_SECTION",
  DELETE_SECTION: "DELETE_SECTION",

  // Subjects
  CREATE_SUBJECT: "CREATE_SUBJECT",
  UPDATE_SUBJECT: "UPDATE_SUBJECT",
  DELETE_SUBJECT: "DELETE_SUBJECT",

  // Announcements
  CREATE_ANNOUNCEMENT: "CREATE_ANNOUNCEMENT",
  UPDATE_ANNOUNCEMENT: "UPDATE_ANNOUNCEMENT",
  DELETE_ANNOUNCEMENT: "DELETE_ANNOUNCEMENT",

  // Exams
  CREATE_EXAM: "CREATE_EXAM",
  UPDATE_EXAM: "UPDATE_EXAM",
  DELETE_EXAM: "DELETE_EXAM",

  // Results
  SAVE_RESULTS: "SAVE_RESULTS",

  // Attendance
  MARK_ATTENDANCE: "MARK_ATTENDANCE",

  // Fees
  CREATE_FEE_CATEGORY: "CREATE_FEE_CATEGORY",
  UPDATE_FEE_CATEGORY: "UPDATE_FEE_CATEGORY",
  DELETE_FEE_CATEGORY: "DELETE_FEE_CATEGORY",
  CREATE_FEE_STRUCTURE: "CREATE_FEE_STRUCTURE",
  DELETE_FEE_STRUCTURE: "DELETE_FEE_STRUCTURE",
  ASSIGN_FEE_STRUCTURE: "ASSIGN_FEE_STRUCTURE",
  RECORD_PAYMENT: "RECORD_PAYMENT",

  // Academic Years
  CREATE_ACADEMIC_YEAR: "CREATE_ACADEMIC_YEAR",
  SET_CURRENT_YEAR: "SET_CURRENT_YEAR",
  ROLLOVER_YEAR: "ROLLOVER_YEAR",
  MIGRATE_TIMETABLE: "MIGRATE_TIMETABLE",

  // Schools
  CREATE_SCHOOL: "CREATE_SCHOOL",
  UPDATE_SCHOOL: "UPDATE_SCHOOL",
  DELETE_SCHOOL: "DELETE_SCHOOL",
  TOGGLE_SCHOOL_STATUS: "TOGGLE_SCHOOL_STATUS",

  // Users
  RESET_PASSWORD: "RESET_PASSWORD",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  REMOVE_AVATAR: "REMOVE_AVATAR",

  // Imports
  IMPORT_STUDENTS: "IMPORT_STUDENTS",
  IMPORT_TEACHERS: "IMPORT_TEACHERS",

  // Timetable
  UPSERT_PERIOD: "UPSERT_PERIOD",
  DELETE_PERIOD: "DELETE_PERIOD",
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ─────────────────────────────────────────────────────────────────
// ACTION DISPLAY LABELS
// ─────────────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  CREATE_STUDENT: "Created Student",
  UPDATE_STUDENT: "Updated Student",
  DELETE_STUDENT: "Deleted Student",

  CREATE_TEACHER: "Created Teacher",
  UPDATE_TEACHER: "Updated Teacher",
  DELETE_TEACHER: "Deleted Teacher",

  CREATE_CLASS: "Created Class",
  UPDATE_CLASS: "Updated Class",
  DELETE_CLASS: "Deleted Class",

  CREATE_SECTION: "Created Section",
  UPDATE_SECTION: "Updated Section",
  DELETE_SECTION: "Deleted Section",

  CREATE_SUBJECT: "Created Subject",
  UPDATE_SUBJECT: "Updated Subject",
  DELETE_SUBJECT: "Deleted Subject",

  CREATE_ANNOUNCEMENT: "Published Announcement",
  UPDATE_ANNOUNCEMENT: "Updated Announcement",
  DELETE_ANNOUNCEMENT: "Deleted Announcement",

  CREATE_EXAM: "Created Exam",
  UPDATE_EXAM: "Updated Exam",
  DELETE_EXAM: "Deleted Exam",

  SAVE_RESULTS: "Saved Results",
  MARK_ATTENDANCE: "Marked Attendance",

  CREATE_FEE_CATEGORY: "Created Fee Category",
  UPDATE_FEE_CATEGORY: "Updated Fee Category",
  DELETE_FEE_CATEGORY: "Deleted Fee Category",
  CREATE_FEE_STRUCTURE: "Created Fee Structure",
  DELETE_FEE_STRUCTURE: "Deleted Fee Structure",
  ASSIGN_FEE_STRUCTURE: "Assigned Fee to Students",
  RECORD_PAYMENT: "Recorded Payment",

  CREATE_ACADEMIC_YEAR: "Created Academic Year",
  SET_CURRENT_YEAR: "Set Current Year",
  ROLLOVER_YEAR: "Year Rollover",
  MIGRATE_TIMETABLE: "Migrated Timetable",

  CREATE_SCHOOL: "Created School",
  UPDATE_SCHOOL: "Updated School",
  DELETE_SCHOOL: "Deleted School",
  TOGGLE_SCHOOL_STATUS: "Toggled School Status",

  RESET_PASSWORD: "Reset Password",
  CHANGE_PASSWORD: "Changed Password",
  UPDATE_PROFILE: "Updated Profile",
  REMOVE_AVATAR: "Removed Avatar",

  IMPORT_STUDENTS: "Imported Students",
  IMPORT_TEACHERS: "Imported Teachers",

  UPSERT_PERIOD: "Updated Timetable Period",
  DELETE_PERIOD: "Cleared Timetable Period",
};

// ─────────────────────────────────────────────────────────────────
// ACTION BADGE STYLE
// ─────────────────────────────────────────────────────────────────

export function actionBadge(
  action: string,
): string {
  if (
    action.startsWith("CREATE_") ||
    action.startsWith("IMPORT_")
  ) {
    return "bg-green-50 text-green-700 border border-green-200";
  }

  if (
    action.startsWith("UPDATE_") ||
    action.startsWith("UPSERT_")
  ) {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }

  if (
    action.startsWith("DELETE_") ||
    action.startsWith("REMOVE_")
  ) {
    return "bg-red-50 text-red-600 border border-red-200";
  }

  if (
    action.startsWith("MARK_") ||
    action.startsWith("SAVE_")
  ) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  }

  if (
    action.startsWith("RECORD_") ||
    action.startsWith("ASSIGN_")
  ) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (action.startsWith("TOGGLE_")) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (
    action.startsWith("ROLLOVER_") ||
    action.startsWith("MIGRATE_") ||
    action.startsWith("SET_")
  ) {
    return "bg-purple-50 text-purple-700 border border-purple-200";
  }

  if (
    action === "RESET_PASSWORD" ||
    action === "CHANGE_PASSWORD"
  ) {
    return "bg-orange-50 text-orange-700 border border-orange-200";
  }

  return "bg-gray-100 text-gray-600 border border-gray-200";
}

// ─────────────────────────────────────────────────────────────────
// ROLE BADGE STYLE
// ─────────────────────────────────────────────────────────────────

export function roleBadgeStyle(
  role: string,
): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-red-50 text-red-700";

    case "SCHOOL_ADMIN":
      return "bg-purple-50 text-purple-700";

    case "TEACHER":
      return "bg-blue-50 text-blue-700";

    case "STUDENT":
      return "bg-green-50 text-green-700";

    case "PARENT":
      return "bg-orange-50 text-orange-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

// ─────────────────────────────────────────────────────────────────
// LOG ACTION
// Fire-and-forget; audit failure does not fail main action.
// ─────────────────────────────────────────────────────────────────

export interface LogActionParams {
  userId: string;
  userRole: string;
  userName: string;

  schoolId?: string | null;
  schoolName?: string | null;

  action: AuditAction | string;

  entity: string;
  entityId?: string | null;
  entityName?: string | null;

  metadata?: Record<string, unknown>;
}

export function logAction(
  params: LogActionParams,
): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        userName: params.userName,

        schoolId: params.schoolId ?? null,
        schoolName: params.schoolName ?? null,

        action: params.action,

        entity: params.entity,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,

        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    .catch((error) => {
      console.error(
        "[audit] Failed to write log:",
        error,
      );
    });
}

// ─────────────────────────────────────────────────────────────────
// DATE FILTER HELPERS
// ─────────────────────────────────────────────────────────────────

export function getDateFilter(
  range: string | undefined,
): { gte?: Date; lte?: Date } | undefined {
  const now = new Date();

  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      return {
        gte: start,
      };
    }

    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);

      return {
        gte: start,
      };
    }

    case "month": {
      const start = new Date(now);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      return {
        gte: start,
      };
    }

    default:
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────
// ENTITY FILTER OPTIONS
// ─────────────────────────────────────────────────────────────────

export const ALL_ENTITIES = [
  "Student",
  "Teacher",
  "Class",
  "Section",
  "Subject",
  "Announcement",
  "Exam",
  "Result",
  "Attendance",
  "FeeCategory",
  "FeeStructure",
  "FeePayment",
  "AcademicYear",
  "Period",
  "School",
  "User",
  "StudentImport",
  "TeacherImport",
] as const;