export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      redirect("/login");
    }

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
        user={dbUser} 
        currentAcademicYear={currentAcademicYear} 
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </DashboardShell>
    );
  } catch (error: any) {
    // Je redirect error hove taan usnu throw hin dena zaroori hai Next.js routing layi
    if (error?.message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    
    console.error("Dashboard Layout Error:", error);
    return (
      <div style={{ padding: "40px", color: "red", fontFamily: "sans-serif" }}>
        <h2>Server Error in Dashboard Layout:</h2>
        <pre>{error?.message || JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }
}