import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@prisma/client";

// ─── Tailwind class merge ─────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Role → dashboard path ────────────────────────────────────
export const ROLE_DASHBOARD: Record<Exclude<Role, "PARENT">, string> = {
  SUPER_ADMIN:  "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER:      "/teacher",
  STUDENT:      "/student",
};

export function getDashboardPath(role?: Role | string): string {
  if (!role) return "/login";
  return ROLE_DASHBOARD[role as Exclude<Role, "PARENT">] ?? "/login";
}

// ─── Formatted Role Labels ──────────────────────────────────
export function formatRoleLabel(role: Role): string {
  const labels: Record<Exclude<Role, "PARENT">, string> = {
    SUPER_ADMIN:  "Super Admin",
    SCHOOL_ADMIN: "School Admin",
    TEACHER:      "Teacher",
    STUDENT:      "Student",
  };
  return labels[role as Exclude<Role, "PARENT">] ?? role;
}