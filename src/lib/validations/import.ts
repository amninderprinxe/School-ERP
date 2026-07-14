import { z } from "zod";

const VALID_GENDERS = ["MALE", "FEMALE", "OTHER", ""] as const;
const DATE_RE       = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Shared row types ──────────────────────────────────────────────

export interface StudentImportRow {
  name:        string;
  email:       string;
  gender:      string;
  phone:       string;
  rollNumber:  string;
  admissionNo: string;
  dateOfBirth: string;
  bloodGroup:  string;
  className:   string;
  sectionName: string;
}

export interface TeacherImportRow {
  name:          string;
  email:         string;
  gender:        string;
  phone:         string;
  employeeCode:  string;
  qualification: string;
  joiningDate:   string;
}

// ── Parsed (pre-submit) row ───────────────────────────────────────

export interface ParsedRow<T> {
  rowIndex: number;       // 1-based row number in the file
  data:     T;
  errors:   string[];
  isValid:  boolean;
}

// ── Import action result ──────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped:  number;          // duplicate email
  failed:   number;
  errors:   ImportRowError[];
}

export interface ImportRowError {
  row:    number;
  email:  string;
  reason: string;
}

// ── Client-side validators ────────────────────────────────────────

export function validateStudentRow(
  rowIndex: number,
  data:     StudentImportRow,
): ParsedRow<StudentImportRow> {
  const errors: string[] = [];

  if (!data.name.trim())
    errors.push("Name is required");
  else if (data.name.trim().length < 2)
    errors.push("Name must be at least 2 characters");

  if (!data.email.trim())
    errors.push("Email is required");
  else if (!EMAIL_RE.test(data.email.trim()))
    errors.push("Email format is invalid");

  if (data.gender && !VALID_GENDERS.includes(data.gender as typeof VALID_GENDERS[number]))
    errors.push(`Gender must be MALE, FEMALE, or OTHER (got "${data.gender}")`);

  if (data.dateOfBirth && !DATE_RE.test(data.dateOfBirth))
    errors.push(`dateOfBirth must be YYYY-MM-DD (got "${data.dateOfBirth}")`);

  if (data.sectionName && !data.className)
    errors.push("className is required when sectionName is provided");

  return { rowIndex, data, errors, isValid: errors.length === 0 };
}

export function validateTeacherRow(
  rowIndex: number,
  data:     TeacherImportRow,
): ParsedRow<TeacherImportRow> {
  const errors: string[] = [];

  if (!data.name.trim())
    errors.push("Name is required");
  else if (data.name.trim().length < 2)
    errors.push("Name must be at least 2 characters");

  if (!data.email.trim())
    errors.push("Email is required");
  else if (!EMAIL_RE.test(data.email.trim()))
    errors.push("Email format is invalid");

  if (data.gender && !VALID_GENDERS.includes(data.gender as typeof VALID_GENDERS[number]))
    errors.push(`Gender must be MALE, FEMALE, or OTHER (got "${data.gender}")`);

  if (data.joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.joiningDate))
    errors.push(`joiningDate must be YYYY-MM-DD (got "${data.joiningDate}")`);

  return { rowIndex, data, errors, isValid: errors.length === 0 };
}   