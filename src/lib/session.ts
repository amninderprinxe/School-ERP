import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
 * Enforces auth + role restriction + live active/suspended check.
 * Redirects to /login if unauthenticated or user inactive.
 * Redirects to /suspended if school is suspended.
 * Redirects to /unauthorized if role doesn't match.
 *
 * @example
 *   const user = await requireRole(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Live database check
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  if (!dbUser || !dbUser.isActive) {
    redirect("/login?error=account_disabled");
  }

  // SUPER_ADMIN ਨੂੰ ਛੱਡ ਕੇ ਬਾਕੀ ਸਾਰੇ ਸਕੂਲ ਯੂਜ਼ਰਾਂ ਲਈ ਸਸਪੈਂਡ ਸਟੇਟਸ ਲਾਗੂ ਕਰੋ
  if (dbUser.role !== "SUPER_ADMIN") {
    if (!dbUser.schoolId || !dbUser.school) {
      redirect("/login?error=no_school");
    }

    const schoolStatus = (dbUser.school as any).status;
    const isSchoolActive = (dbUser.school as any).isActive;

    if (schoolStatus === "SUSPENDED" || isSchoolActive === false) {
      redirect("/suspended");
    }
  }

  if (!allowedRoles.includes(dbUser.role)) {
    redirect("/unauthorized");
  }

  return {
    ...session.user,
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    schoolId: dbUser.schoolId,
  };
}