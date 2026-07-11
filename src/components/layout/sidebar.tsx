"use client";

import { usePathname } from "next/navigation";
import Link            from "next/link";
import {
  LayoutDashboard, Building2, Users, Settings,
  GraduationCap, UserCheck, BookOpen, BookMarked,
  Megaphone, CalendarCheck, Award, Baby, Layers,
  ClipboardList, ClipboardCheck,
  CalendarDays,           // ← NEW
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV_CONFIG }      from "@/config/nav";
import { formatRoleLabel } from "@/lib/utils";
import type { ShellUser }  from "./dashboard-shell";

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
  CalendarDays,   // ← NEW
};

interface SidebarProps {
  user:    ShellUser;
  onClose: () => void;
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

export function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_CONFIG[user.role];

  return (
    <div className="flex h-full flex-col bg-slate-900">

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-16 px-5
        border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center
            justify-center shadow-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-[17px] tracking-tight">
            School ERP
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="lg:hidden p-1.5 text-slate-400 hover:text-white
            rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon     = ICON_MAP[item.icon];
          const isActive = item.exactMatch
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                "font-medium transition-colors duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              {Icon && (
                <Icon
                  className={[
                    "w-[18px] h-[18px] shrink-0",
                    isActive ? "text-white" : "text-slate-400",
                  ].join(" ")}
                />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-700/60 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg
          hover:bg-slate-800 transition-colors cursor-default">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600
            rounded-full flex items-center justify-center text-white text-sm
            font-bold shrink-0 shadow-md">
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">
              {user.name ?? "User"}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {formatRoleLabel(user.role)}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
