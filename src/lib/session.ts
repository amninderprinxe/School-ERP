import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

/**
 * Returns the current session user or null.
 * Server components / Server Actions only.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Returns the schoolId from the session.
 * SUPER_ADMIN will have null (cross-school access).
 */
export async function getCurrentSchoolId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.schoolId ?? null;
}

/**
 * Enforces auth + role restriction.
 * Redirects to /login if unauthenticated.
 * Redirects to /unauthorized if role doesn't match.
 *
 * @example
 *   const user = await requireRole(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return session.user;
}
