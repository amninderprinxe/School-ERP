import { auth }              from "@/lib/auth";
import { redirect }          from "next/navigation";
import { prisma }            from "@/lib/db";
import {
  NotificationsClient,
}                            from "@/components/notifications/notifications-client";

export const metadata = { title: "Notifications" };

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{
    filter?: string;
    page?:   string;
  }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp     = await searchParams;
  const filter = ["all","unread","read"].includes(sp.filter ?? "")
    ? (sp.filter as "all" | "unread" | "read") ?? "all"
    : "all";
  const page   = Math.max(1, parseInt(sp.page ?? "1"));
  const skip   = (page - 1) * PAGE_SIZE;

  const where = {
    userId:  session.user.id,
    ...(filter === "unread" ? { isRead: false } : {}),
    ...(filter === "read"   ? { isRead: true  } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE,
      skip,
      select: {
        id:        true,
        title:     true,
        body:      true,
        link:      true,
        type:      true,
        isRead:    true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <NotificationsClient
      notifications={notifications}
      total={total}
      unreadCount={unreadCount}
      filter={filter}
      page={page}
      totalPages={totalPages}
    />
  );
}