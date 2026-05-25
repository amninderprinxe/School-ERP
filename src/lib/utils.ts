import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@prisma/client";

// ─── Tailwind class merge ─────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Role → dashboard path ────────────────────────────────────
export const ROLE_DASHBOARD: Record<Role, string> = {
  SUPER_ADMIN:  "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER:      "/teacher",
  STUDENT:      "/student",
  PARENT:       "/parent",
};

export function getDashboardPath(role: Role): string {
  return ROLE_DASHBOARD[role] ?? "/login";
}

export function formatRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN:  "Super Admin",
    SCHOOL_ADMIN: "School Admin",
    TEACHER:      "Teacher",
    STUDENT:      "Student",
    PARENT:       "Parent",
  };
  return labels[role] ?? role;
}