"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";

interface Props {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d ago`
    : new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function NotificationListItem({
  id,
  title,
  body,
  link,
  isRead: initialRead,
  createdAt,
}: Props) {
  const router = useRouter();
  const [isRead, setIsRead] = useState(initialRead);
  const [showModal, setShowModal] = useState(false);

  const markAsRead = () => {
    if (!isRead) {
      setIsRead(true);
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    markAsRead();

    // If the link is an admin-only path or if there's body content to read, show dialog
    const isAdminRoute = link?.startsWith("/school-admin") || link?.startsWith("/super-admin");
    
    if (isAdminRoute || !link) {
      setShowModal(true);
    } else {
      router.push(link);
    }
  };

  return (
    <>
      <li>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full text-left px-5 py-4 flex items-start gap-4
            transition-colors group
            ${
              !isRead
                ? "bg-blue-50/40 hover:bg-blue-50"
                : "hover:bg-gray-50/60"
            }`}
        >
          {/* Unread dot */}
          <span
            aria-hidden="true"
            className={`mt-[7px] w-2 h-2 rounded-full shrink-0
              ${!isRead ? "bg-blue-500" : "bg-transparent"}`}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm leading-snug
                ${
                  !isRead
                    ? "font-semibold text-gray-900"
                    : "font-medium text-gray-700"
                }`}
            >
              {title}
            </p>
            {body && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">
                {body}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">
              {relTime(createdAt)}
            </p>
          </div>

          {/* Link icon */}
          {link && (
            <ExternalLink
              className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors"
              aria-hidden
            />
          )}
        </button>
      </li>

      {/* ── Announcement / Notification Detail Modal ────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-snug">
                  {title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-600 leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
              {body || "No additional details provided."}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}