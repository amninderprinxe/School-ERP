"use client";

import {
  useState, useEffect, useRef, useTransition, useCallback,
}                           from "react";
import { useRouter, usePathname } from "next/navigation";
import Link                 from "next/link";
import { Bell, X, CheckCheck, ExternalLink } from "lucide-react";
import { cn }               from "@/lib/utils";

interface NotificationItem {
  id: string; title: string; body: string | null;
  link: string | null; isRead: boolean; createdAt: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago`
    : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const router   = useRouter();
  const pathname = usePathname();

  const [open,        setOpen]        = useState(false);
  const [items,       setItems]       = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPendingAll, startMarkAll]  = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { notifications: NotificationItem[]; unreadCount: number };
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { fetchNotifications(); }, [pathname, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const markRead = async (n: NotificationItem) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetch("/api/notifications/read", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    if (n.link) { setOpen(false); router.push(n.link); }
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    startMarkAll(async () => {
      try { await fetch("/api/notifications/read-all", { method: "POST" }); } catch {}
    });
  };

  const hasUnread = unreadCount > 0;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((p) => { if (!p) fetchNotifications(); return !p; }); }}
        aria-label={hasUnread ? `Notifications — ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative p-2 rounded-xl
          text-gray-500 dark:text-gray-400
          hover:text-gray-900 dark:hover:text-gray-100
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500
          focus-visible:ring-offset-1"
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className={cn(
            "absolute top-1 right-1 flex items-center justify-center",
            "rounded-full bg-red-500 text-white font-bold leading-none",
            "ring-2 ring-white dark:ring-gray-900",
            unreadCount > 9
              ? "text-[8px] min-w-[18px] h-[18px] px-0.5"
              : "text-[9px] w-3.5 h-3.5",
          )}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 z-50
            w-[340px] sm:w-[380px]
            bg-white dark:bg-gray-900
            rounded-2xl border border-gray-100 dark:border-gray-800
            shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
            flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5
            border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</p>
              {hasUnread && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={isPendingAll}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs
                    font-semibold text-blue-600 dark:text-blue-400
                    hover:bg-blue-50 dark:hover:bg-blue-950
                    rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden />
                  All read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 dark:text-gray-500
                  hover:text-gray-700 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  rounded-lg transition-colors"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {items.length === 0 ? (
              <div className="py-14 text-center">
                <Bell className="w-9 h-9 text-gray-200 dark:text-gray-700 mx-auto mb-3" aria-hidden />
                <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <ul role="list">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 border-b last:border-b-0",
                        "border-gray-50 dark:border-gray-800/60",
                        "transition-colors flex items-start gap-3 group",
                        !n.isRead
                          ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      )}
                    >
                      <span className={cn(
                        "mt-[7px] w-2 h-2 rounded-full shrink-0",
                        !n.isRead ? "bg-blue-500" : "bg-transparent",
                      )} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-snug line-clamp-2",
                          !n.isRead
                            ? "font-semibold text-gray-900 dark:text-gray-100"
                            : "font-medium text-gray-700 dark:text-gray-300",
                        )}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1.5">
                          {relTime(n.createdAt)}
                        </p>
                      </div>
                      {n.link && (
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600
                          group-hover:text-gray-400 dark:group-hover:text-gray-500 shrink-0 mt-1" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800
            bg-gray-50/60 dark:bg-gray-900/60">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs
                font-semibold text-blue-600 dark:text-blue-400
                hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              View all notifications
              <ExternalLink className="w-3 h-3" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}