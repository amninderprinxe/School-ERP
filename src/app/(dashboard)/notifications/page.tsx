import { auth }             from "@/lib/auth";
import { redirect }         from "next/navigation";
import { prisma }           from "@/lib/db";
import Link                 from "next/link";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
}                           from "lucide-react";
import { MarkAllReadButton }    from "@/components/notifications/mark-all-read-button";
import { NotificationListItem } from "@/components/notifications/notification-list-item";

export const metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

interface Props {
  searchParams: Promise<{ page?: string; filter?: string }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp     = await searchParams;
  const page   = Math.max(1, parseInt(sp.page ?? "1"));
  const filter = sp.filter === "unread" ? "unread" : "all";
  const skip   = (page - 1) * PAGE_SIZE;

  const where = {
    userId: session.user.id,
    ...(filter === "unread" && { isRead: false }),
  };

  const [notifications, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | number>): string {
    const params = new URLSearchParams({
      ...(filter !== "all" && { filter }),
      page: String(page),
      ...overrides,
    });
    for (const [k, v] of Array.from(params.entries())) {
      if (!v || v === "1") params.delete(k);
    }
    const str = params.toString();
    return str ? `?${str}` : "?";
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} notification{totalCount !== 1 ? "s" : ""}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {/* ── Filter tabs ────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-100">
        {[
          { value: "all",    label: `All (${totalCount})` },
          { value: "unread", label: `Unread (${unreadCount})` },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={buildUrl({ filter: tab.value, page: 1 })}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg
              border-b-2 transition-colors -mb-px
              ${filter === tab.value
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── List ───────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Notifications appear here when actions are taken in the system.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          overflow-hidden">
          <ul role="list" className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <NotificationListItem
                key={n.id}
                id={n.id}
                title={n.title}
                body={n.body}
                link={n.link}
                isRead={n.isRead}
                createdAt={n.createdAt.toISOString()}
              />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center
              justify-between">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} · {totalCount} total
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: page - 1 })}
                    className="inline-flex items-center gap-1 px-3 py-1.5
                      text-sm font-medium text-gray-600 bg-gray-100
                      hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: page + 1 })}
                    className="inline-flex items-center gap-1 px-3 py-1.5
                      text-sm font-medium text-white bg-blue-600
                      hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}