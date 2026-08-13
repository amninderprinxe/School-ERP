"use client";

import { useState, useTransition }    from "react";
import { useRouter }                  from "next/navigation";
import Link                           from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Megaphone,
  ClipboardList,
  Award,
  Wallet,
  AlertCircle,
  type LucideIcon,
}                                     from "lucide-react";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  type NotificationDTO,
}                                     from "@/action/notification.actions";

// ── Icon / color helpers ──────────────────────────────────────────

const TYPE_ICON: Record<string, LucideIcon> = {
  ANNOUNCEMENT:     Megaphone,
  EXAM_CREATED:     ClipboardList,
  RESULT_PUBLISHED: Award,
  FEE_RECORDED:     Wallet,
  FEE_DUE:          AlertCircle,
  SYSTEM:           Bell,
};

const TYPE_COLOR: Record<string, string> = {
  ANNOUNCEMENT:     "bg-blue-100 text-blue-600",
  EXAM_CREATED:     "bg-purple-100 text-purple-600",
  RESULT_PUBLISHED: "bg-green-100 text-green-600",
  FEE_RECORDED:     "bg-emerald-100 text-emerald-600",
  FEE_DUE:          "bg-red-100 text-red-600",
  SYSTEM:           "bg-gray-100 text-gray-600",
};

function relativeTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Props ─────────────────────────────────────────────────────────

interface Props {
  notifications: NotificationDTO[];
  total:         number;
  unreadCount:   number;
  filter:        "all" | "unread" | "read";
  page:          number;
  totalPages:    number;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function NotificationsClient({
  notifications: initial,
  total,
  unreadCount:   initialUnread,
  filter,
  page,
  totalPages,
}: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items,     setItems]        = useState(initial);
  const [unread,    setUnread]       = useState(initialUnread);

  // ── Mark one as read ────────────────────────────────────────────
  const handleMarkRead = (n: NotificationDTO) => {
    if (n.isRead) {
      if (n.link) router.push(n.link);
      return;
    }
    startTransition(async () => {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      setUnread((c) => Math.max(0, c - 1));
      if (n.link) router.push(n.link);
    });
  };

  // ── Mark all read ───────────────────────────────────────────────
  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    });
  };

  // ── Delete one ──────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteNotification(id);
      const deleted = items.find((x) => x.id === id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (deleted && !deleted.isRead) {
        setUnread((c) => Math.max(0, c - 1));
      }
    });
  };

  // ── Delete all ──────────────────────────────────────────────────
  const handleDeleteAll = () => {
    if (
      !confirm(
        "Delete all notifications? This cannot be undone.",
      )
    ) return;
    startTransition(async () => {
      await deleteAllNotifications();
      setItems([]);
      setUnread(0);
    });
  };

  // ── Filter tabs ─────────────────────────────────────────────────
  const FILTERS: { label: string; value: string }[] = [
    { label: "All",    value: "all"    },
    { label: "Unread", value: "unread" },
    { label: "Read",   value: "read"   },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread > 0
              ? `${unread} unread notification${unread !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
                font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100
                border border-blue-200 rounded-lg transition-colors
                disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
                font-semibold text-red-600 bg-red-50 hover:bg-red-100
                border border-red-200 rounded-lg transition-colors
                disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => {
          const isActive = filter === f.value;
          const params   = new URLSearchParams({ filter: f.value });
          return (
            <Link
              key={f.value}
              href={`/notifications?${params.toString()}`}
              className={[
                "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900",
              ].join(" ")}
            >
              {f.label}
              {f.value === "unread" && unread > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold
                  bg-red-100 text-red-600 rounded-full">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Notification list ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                ? "No read notifications"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Notifications appear here when there is school activity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((n) => {
              const Icon  = TYPE_ICON[n.type] ?? Bell;
              const color = TYPE_COLOR[n.type] ?? "bg-gray-100 text-gray-600";

              return (
                <div
                  key={n.id}
                  className={[
                    "flex items-start gap-4 px-5 py-4 transition-colors",
                    !n.isRead ? "bg-blue-50/20" : "hover:bg-gray-50/40",
                  ].join(" ")}
                >
                  {/* Type icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center
                      justify-center shrink-0 mt-0.5 ${color}`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-tight ${
                            !n.isRead
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {n.title}
                          {!n.isRead && (
                            <span className="ml-2 inline-block w-2 h-2
                              rounded-full bg-blue-500 align-middle" />
                          )}
                        </p>
                        {n.body && (
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>

                      {/* Row actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {n.link && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                              text-xs font-semibold text-blue-600 bg-blue-50
                              hover:bg-blue-100 rounded-lg transition-colors
                              disabled:opacity-50"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n)}
                            disabled={isPending}
                            className="p-1.5 text-gray-400 hover:text-blue-600
                              hover:bg-blue-50 rounded-lg transition-colors
                              disabled:opacity-50"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id)}
                          disabled={isPending}
                          className="p-1.5 text-gray-400 hover:text-red-500
                            hover:bg-red-50 rounded-lg transition-colors
                            disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/notifications?filter=${filter}&page=${page - 1}`}
                className="px-4 py-2 text-sm font-medium text-gray-600
                  bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/notifications?filter=${filter}&page=${page + 1}`}
                className="px-4 py-2 text-sm font-medium text-white
                  bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}