import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/db";
import { redirect }        from "next/navigation";
import { DashboardShell }  from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch live user row so avatarUrl, name changes are reflected immediately
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

  return (
    <DashboardShell user={dbUser}>
      {children}
    </DashboardShell>
  );
}
