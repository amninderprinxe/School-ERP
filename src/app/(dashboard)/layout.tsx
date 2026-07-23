import { auth }             from "@/lib/auth";
import { prisma }           from "@/lib/db";
import { redirect }         from "next/navigation";
import { DashboardShell }   from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      schoolId:  true,
      avatarUrl: true,
    },
  });

  if (!dbUser) redirect("/login");

  // Fetch current academic year + unread notification count in parallel
  const [currentAcademicYear, unreadNotificationCount] = await Promise.all([
    dbUser.schoolId
      ? prisma.academicYear.findFirst({
          where:  { schoolId: dbUser.schoolId, isCurrent: true },
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
        currentAcademicYear:      currentAcademicYear ?? null,
        unreadNotificationCount,
      }}
    >
      {children}
    </DashboardShell>
  );
}
