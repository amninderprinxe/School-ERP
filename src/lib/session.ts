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

  const userRole = session.user.role;
  if (!allowedRoles.includes(userRole)) {
    redirect("/unauthorized");
  }

  // SUPER_ADMIN has platform-wide unrestricted access
  if (userRole === "SUPER_ADMIN") {
    return session.user;
  }

  // For school-level roles: verify user & school status
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
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

    // 🚨 School Suspended Handling:
    if (dbUser.school.status === "SUSPENDED") {
      if (dbUser.role === "SCHOOL_ADMIN") {
        redirect("/suspended");
      } else {
        // Teachers, Students, Parents will see login failed / suspended error
        redirect("/login?error=account_suspended");
      }
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[REQUIRE_ROLE_ERROR]", err);
  }

  return session.user;
}