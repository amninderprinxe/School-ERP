"use client";

import {
  useState,
  useEffect,
  useRef,
  useTransition,
  useCallback,
}                          from "react";
import { useRouter }       from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  ExternalLink,
  Megaphone,
  ClipboardList,
  Award,
  Wallet,
  AlertCircle,
  type LucideIcon,
}                          from "lucide-react";
import {
  getRecentNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationDTO,
}                          from "@/action/notification.actions";

// ── Icon per notification type ─────────────────────────────────────

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

// ── Time helper ────────────────────────────────────────────────────

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
    day: "numeric", month: "short",
  });
}

// ── Props ──────────────────────────────────────────────────────────

interface Props {
  initialUnreadCount: number;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function NotificationBell({ initialUnreadCount }: Props) {
  const router = useRouter();

  const [open,         setOpen]         = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [isPending,    startTransition] = useTransition();

  const buttonRef   = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close on Escape ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Poll unread count every 60 s ──────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch on open ─────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getRecentNotifications();
      setNotifications(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBellClick = async () => {
    if (!open) {
      setOpen(true);
      await fetchNotifications();
    } else {
      setOpen(false);
    }
  };

  // ── Mark single read ──────────────────────────────────────────
  const handleMarkRead = (n: NotificationDTO) => {
    startTransition(async () => {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      if (!n.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      if (n.link) {
        setOpen(false);
        router.push(n.link);
      }
    });
  };

  // ── Mark all read ─────────────────────────────────────────────
  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    });
  };

  // ── Navigate to full page ─────────────────────────────────────
  const handleViewAll = () => {
    setOpen(false);
    router.push("/notifications");
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleBellClick}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900
          hover:bg-gray-100 transition-colors focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5
              bg-red-500 text-white text-[10px] font-bold rounded-full
              flex items-center justify-center ring-2 ring-white leading-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl
            border border-gray-200 shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
            border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold
                  bg-red-100 text-red-600 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 px-2.5 py-1
                    text-xs font-semibold text-blue-600 hover:bg-blue-50
                    rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  All read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 text-gray-400 hover:text-gray-600
                  rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <svg
                  className="animate-spin h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  All caught up!
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const Icon  = TYPE_ICON[n.type] ?? Bell;
                  const color = TYPE_COLOR[n.type] ?? "bg-gray-100 text-gray-600";

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      disabled={isPending}
                      className={[
                        "w-full flex items-start gap-3 px-4 py-3.5 text-left",
                        "hover:bg-gray-50/80 transition-colors",
                        "disabled:opacity-60",
                        !n.isRead ? "bg-blue-50/20" : "",
                      ].join(" ")}
                    >
                      {/* Type icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center
                          justify-center shrink-0 mt-0.5 ${color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-tight truncate ${
                              !n.isRead
                                ? "font-semibold text-gray-900"
                                : "font-medium text-gray-700"
                            }`}
                          >
                            {n.title}
                          </p>
                          {/* Unread dot */}
                          {!n.isRead && (
                            <div className="w-2 h-2 rounded-full bg-blue-500
                              shrink-0 mt-1.5" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-gray-500 mt-0.5
                            line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-gray-400">
                            {relativeTime(n.createdAt)}
                          </p>
                          {n.link && (
                            <ExternalLink className="w-2.5 h-2.5 text-gray-300" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50
            text-center">
            <button
              type="button"
              onClick={handleViewAll}
              className="text-xs font-semibold text-blue-600
                hover:text-blue-800 transition-colors"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
