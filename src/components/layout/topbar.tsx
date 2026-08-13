"use client";

import Link                    from "next/link";
import { Menu, Settings, Search } from "lucide-react";
import { LogoutButton }        from "@/components/auth/logout-button";
import { formatRoleLabel }     from "@/lib/utils";
import { NotificationBell }    from "./notification-bell";
import { ThemeToggleIcon }     from "@/components/ui/theme-toggle";
import type { ShellUser }      from "./dashboard-shell";

interface TopbarProps {
  user:          ShellUser;
  onMenuClick:   () => void;
  onSearchClick: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function Avatar({ user }: { user: ShellUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? "Avatar"}
        className="w-8 h-8 rounded-full object-cover shadow ring-2
          ring-white dark:ring-gray-800"
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

export function Topbar({ user, onMenuClick, onSearchClick }: TopbarProps) {
  return (
    <header
      className="h-[60px] bg-white dark:bg-gray-900
        border-b border-gray-100 dark:border-gray-800
        flex items-center gap-3 px-4 sm:px-6 shrink-0 z-10
        shadow-[0_1px_0_0_#f3f4f6] dark:shadow-[0_1px_0_0_#1f2937]"
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="lg:hidden p-2 rounded-xl
          text-gray-500 dark:text-gray-400
          hover:text-gray-900 dark:hover:text-gray-100
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {/* Search trigger */}
      <button
        type="button"
        onClick={onSearchClick}
        aria-label="Open command palette (Ctrl+K)"
        title="Search (Ctrl+K)"
        className="flex items-center gap-2.5 flex-1 max-w-xs
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-200 dark:border-gray-700
          hover:border-gray-300 dark:hover:border-gray-600
          text-gray-400 dark:text-gray-500
          hover:text-gray-600 dark:hover:text-gray-300
          px-3 py-2 rounded-xl transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Search className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span className="text-[13px] font-medium hidden sm:block">
          Search anything…
        </span>
        <span className="ml-auto hidden sm:flex items-center gap-1">
          <kbd className="text-[10px] bg-white dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            text-gray-400 dark:text-gray-400
            px-1.5 py-0.5 rounded-md font-sans shadow-sm leading-none">
            ⌘K
          </kbd>
        </span>
      </button>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">

        {/* Academic year badge */}
        {user.currentAcademicYear && (
          <Link
            href="/school-admin/academic-years"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5
              text-[11px] font-semibold
              bg-indigo-50 dark:bg-indigo-950
              text-indigo-700 dark:text-indigo-400
              border border-indigo-200 dark:border-indigo-800
              rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900
              transition-colors focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            📅 {user.currentAcademicYear.name}
          </Link>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* ── Dark mode toggle ← NEW ────────────────────── */}
        <ThemeToggleIcon />

        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* User identity */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Avatar user={user} />
          <div className="hidden md:block text-right">
            <p className="text-[13px] font-semibold
              text-gray-900 dark:text-gray-100 leading-none">
              {user.name ?? "User"}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500
              mt-0.5 leading-none">
              {formatRoleLabel(user.role)}
            </p>
          </div>
        </div>

        <LogoutButton variant="ghost" />
      </div>
    </header>
  );
}