import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Check user and user.id both safely
  if (!session?.user?.id) {
    redirect("/login");
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        avatarUrl: true,
      },
    });

    if (!dbUser) {
      redirect("/login");
    }

    // 2. Fetch academic year and notifications in parallel
    const [currentAcademicYear, unreadNotificationCount] = await Promise.all([
      dbUser.schoolId
        ? prisma.academicYear.findFirst({
            where: { schoolId: dbUser.schoolId, isCurrent: true },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),

      prisma.notification.count({
        where: { userId: dbUser.id, isRead: false },
      }),
    ]);

    return (
      <DashboardShell
        user={{
          ...dbUser,
          currentAcademicYear: currentAcademicYear ?? null,
          unreadNotificationCount,
        }}
      >
        {children}
      </DashboardShell>
    );
  } catch (error) {
    console.error("Dashboard Layout Error:", error);
    // Safe fallback if database connection or query fails
    redirect("/login");
  }
}