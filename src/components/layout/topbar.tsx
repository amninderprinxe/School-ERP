"use client";

import Link                    from "next/link";
import { Menu, Settings, CalendarDays } from "lucide-react";
import { LogoutButton }        from "@/components/auth/logout-button";
import { NotificationBell }    from "./notification-bell";
import { formatRoleLabel }     from "@/lib/utils";
import type { ShellUser }      from "./dashboard-shell";

interface TopbarProps {
  user:        ShellUser;
  onMenuClick: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ user }: { user: ShellUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? "Avatar"}
        className="w-8 h-8 rounded-full object-cover shadow ring-2 ring-white"
      />
    );
  }
  return (
    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600
      rounded-full flex items-center justify-center text-white text-xs
      font-bold shadow">
      {getInitials(user.name)}
    </div>
  );
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  return (
    <header
      className="h-16 bg-white border-b border-gray-200 flex items-center
        justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm"
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900
          hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Right cluster */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">

        {/* Academic year badge */}
        {user.currentAcademicYear && (
          <Link
            href="/school-admin/academic-years"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5
              text-xs font-semibold bg-indigo-50 text-indigo-700
              border border-indigo-200 rounded-full hover:bg-indigo-100
              transition-colors"
            title="Academic Year"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {user.currentAcademicYear.name}
          </Link>
        )}

        {/* Notification bell — replaces static bell ── */}
        <NotificationBell
          initialUnreadCount={user.unreadNotificationCount ?? 0}
        />

        {/* Settings */}
        <Link
          href="/settings"
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900
            hover:bg-gray-100 transition-colors"
          aria-label="Account settings"
          title="Account Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-gray-200" />

        {/* User identity */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Avatar user={user} />
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900 leading-none">
              {user.name ?? "User"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatRoleLabel(user.role)}
            </p>
          </div>
        </div>

        {/* Logout */}
        <LogoutButton variant="ghost" />
      </div>
    </header>
  );
}
