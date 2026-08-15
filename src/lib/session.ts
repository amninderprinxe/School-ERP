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
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Check user role first
  const userRole = session.user.role;
  if (!allowedRoles.includes(userRole)) {
    redirect("/unauthorized");
  }

  // 2. SUPER_ADMIN bypasses all school checks
  if (userRole === "SUPER_ADMIN") {
    return session.user;
  }

  // 3. For school users (ADMIN, TEACHER, STUDENT), verify school status safely
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isActive: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!dbUser || dbUser.isActive === false) {
      redirect("/login?error=account_disabled");
    }

    if (!dbUser.schoolId || !dbUser.school) {
      redirect("/login?error=no_school");
    }

    if (dbUser.school.status === "SUSPENDED") {
      redirect("/suspended");
    }
  } catch (err: any) {
    // If redirect was triggered, rethrow it for Next.js
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[REQUIRE_ROLE_ERROR]", err);
  }

  return session.user;
}