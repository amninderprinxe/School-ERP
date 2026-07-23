"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  GraduationCap,
  UserCheck,
  BookOpen,
  BookMarked,
  Megaphone,
  CalendarCheck,
  Award,
  Baby,
  Layers,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  Wallet,
  Upload,
  X,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { NAV_CONFIG } from "@/config/nav";
import { formatRoleLabel } from "@/lib/utils";
import { SchoolLogo } from "@/components/common/school-logo";
import type { ShellUser } from "./dashboard-shell";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  GraduationCap,
  UserCheck,
  BookOpen,
  BookMarked,
  Megaphone,
  CalendarCheck,
  Award,
  Baby,
  Layers,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  Wallet,
  Upload,
  ShieldCheck,
};

interface SidebarProps {
  user: ShellUser;
  onClose: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SidebarAvatar({ user }: { user: ShellUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? "Avatar"}
        className="
          h-10 w-10 shrink-0 rounded-full object-cover
          shadow ring-2 ring-slate-600
        "
      />
    );
  }

  return (
    <div
      className="
        flex h-10 w-10 shrink-0 items-center justify-center
        rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
        text-sm font-bold text-white shadow-md
      "
    >
      {getInitials(user.name)}
    </div>
  );
}

export function Sidebar({
  user,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_CONFIG[user.role];

  const hasSchool = Boolean(user.schoolName);

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* ── Brand header ───────────────────────────────────── */}
      <div
        className="
          flex h-16 shrink-0 items-center justify-between
          border-b border-slate-700/60 px-5
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-8 w-8 items-center justify-center
              rounded-lg bg-blue-600 shadow-lg
            "
          >
            <GraduationCap className="h-5 w-5 text-white" />
          </div>

          <span className="text-[17px] font-bold tracking-tight text-white">
            Campus-X
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="
            rounded-md p-1.5 text-slate-400
            transition-colors hover:bg-slate-800
            hover:text-white lg:hidden
          "
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon];

          const isActive = item.exactMatch
            ? pathname === item.href
            : pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                "font-medium transition-colors duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              {Icon && (
                <Icon
                  className={[
                    "h-[18px] w-[18px] shrink-0",
                    isActive
                      ? "text-white"
                      : "text-slate-400",
                  ].join(" ")}
                />
              )}

              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── School/user footer ─────────────────────────────── */}
      <div
        className="
          shrink-0 border-t border-slate-700/60
          px-3 pb-4 pt-3
        "
      >
        <Link
          href="/settings"
          onClick={onClose}
          className="
            flex items-center gap-3 rounded-lg px-2 py-2
            transition-colors hover:bg-slate-800
          "
        >
          {hasSchool ? (
            <SchoolLogo
              schoolName={user.schoolName ?? "School"}
              schoolCode={user.schoolCode}
              size={40}
              className="shrink-0"
            />
          ) : (
            <SidebarAvatar user={user} />
          )}

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate text-sm font-semibold
                leading-none text-white
              "
              title={user.schoolName ?? user.name ?? "User"}
            >
              {user.schoolName ?? user.name ?? "User"}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {formatRoleLabel(user.role)}
            </p>
          </div>

          <Settings className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        </Link>
      </div>
    </div>
  );
}
