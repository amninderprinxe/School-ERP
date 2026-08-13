"use client";

import { useState }        from "react";
import { useRouter }       from "next/navigation";
import { ExternalLink }    from "lucide-react";

interface Props {
  id:        string;
  title:     string;
  body:      string | null;
  link:      string | null;
  isRead:    boolean;
  createdAt: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d ago`
    : new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
}

export function NotificationListItem({
  id, title, body, link, isRead: initialRead, createdAt,
}: Props) {
  const router              = useRouter();
  const [isRead, setIsRead] = useState(initialRead);

  const handleClick = async () => {
    if (!isRead) {
      setIsRead(true);
      fetch("/api/notifications/read", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      }).catch(() => {});
    }
    if (link) {
      router.push(link);
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left px-5 py-4 flex items-start gap-4
          transition-colors group
          ${!isRead
            ? "bg-blue-50/40 hover:bg-blue-50"
            : "hover:bg-gray-50/60"}`}
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
              ${!isRead
                ? "font-semibold text-gray-900"
                : "font-medium text-gray-700"}`}
          >
            {title}
          </p>
          {body && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed
              line-clamp-3">
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
            className="w-4 h-4 text-gray-300 group-hover:text-gray-400
              shrink-0 mt-0.5 transition-colors"
            aria-hidden
          />
        )}
      </button>
    </li>
  );
}