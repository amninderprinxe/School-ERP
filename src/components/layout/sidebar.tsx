"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  BookOpen,
  BookMarked,
  CalendarDays,
  CalendarCheck,
  CalendarOff,
  CalendarClock,
  ClipboardList,
  ClipboardCheck,
  Wallet,
  Upload,
  ShieldCheck,
  Megaphone,
  TrendingUp,
  Award,
  Layers,
  Users,
  Building2,
  Settings,
  Search,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn, formatRoleLabel } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { ThemeSwitch } from "@/components/ui/theme-toggle";
import type { ShellUser } from "./dashboard-shell";
import type { Role } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// NAV CONFIGS
// ─────────────────────────────────────────────────────────────────

interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  exactMatch?: boolean;
}

interface NavGroupDef {
  id: string;
  label: string | null;
  collapsible: boolean;
  defaultOpen: boolean;
  items: NavItemDef[];
}

const SCHOOL_ADMIN_NAV: NavGroupDef[] = [
  {
    id: "core",
    label: null,
    collapsible: false,
    defaultOpen: true,
    items: [
      { label: "Dashboard", href: "/school-admin", icon: LayoutDashboard, exactMatch: true },
      { label: "Analytics", href: "/school-admin/analytics", icon: BarChart3 },
      { label: "Calendar", href: "/school-admin/calendar", icon: CalendarDays },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Classes", href: "/school-admin/classes", icon: BookOpen },
      { label: "Sections", href: "/school-admin/sections", icon: Layers },
      { label: "Students", href: "/school-admin/students", icon: GraduationCap },
      { label: "Teachers", href: "/school-admin/teachers", icon: UserCheck },
      { label: "Subjects", href: "/school-admin/subjects", icon: BookMarked },
      { label: "Exams", href: "/school-admin/exams", icon: ClipboardList },
      { label: "Results", href: "/school-admin/results", icon: ClipboardCheck },
      { label: "Timetable", href: "/school-admin/timetable", icon: CalendarDays },
    ],
  },
  {
    id: "student_ops",
    label: "Student Ops",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Attendance", href: "/school-admin/attendance", icon: CalendarCheck },
      { label: "Holidays", href: "/school-admin/holidays", icon: CalendarOff },
    //  { label: "PTM", href: "/school-admin/ptm", icon: CalendarClock },
      { label: "Promote", href: "/school-admin/promote", icon: TrendingUp },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    collapsible: true,
    defaultOpen: true,
    items: [{ label: "Fees", href: "/school-admin/fees", icon: Wallet }],
  },
  {
    id: "communication",
    label: "Communication",
    collapsible: true,
    defaultOpen: true,
    items: [{ label: "Announcements", href: "/school-admin/announcements", icon: Megaphone }],
  },
  {
    id: "administration",
    label: "Administration",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Academic Years", href: "/school-admin/academic-years", icon: CalendarDays },
      { label: "Import", href: "/school-admin/import", icon: Upload },
      { label: "Audit Log", href: "/school-admin/audit-logs", icon: ShieldCheck },
      { label: "School Settings", href: "/school-admin/settings", icon: Settings },
    ],
  },
];

const SUPER_ADMIN_NAV: NavGroupDef[] = [
  {
    id: "core",
    label: null,
    collapsible: false,
    defaultOpen: true,
    items: [{ label: "Dashboard", href: "/super-admin", icon: LayoutDashboard, exactMatch: true }],
  },
  {
    id: "management",
    label: "Management",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Schools", href: "/super-admin/schools", icon: Building2 },
      { label: "All Users", href: "/super-admin/users", icon: Users },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    collapsible: true,
    defaultOpen: true,
    items: [{ label: "Audit Log", href: "/super-admin/audit-logs", icon: ShieldCheck }],
  },
  {
    id: "settings",
    label: "Settings",
    collapsible: true,
    defaultOpen: true,
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

const TEACHER_NAV: NavGroupDef[] = [
  {
    id: "core",
    label: null,
    collapsible: false,
    defaultOpen: true,
    items: [
      { label: "Dashboard", href: "/teacher", icon: LayoutDashboard, exactMatch: true },
      { label: "Calendar", href: "/teacher/calendar", icon: CalendarDays },
    ],
  },
  {
    id: "teaching",
    label: "Teaching",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Timetable", href: "/teacher/timetable", icon: CalendarDays },
      { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck },
      { label: "Results", href: "/teacher/results", icon: ClipboardCheck },
      // { label: "PTM", href: "/teacher/ptm", icon: CalendarClock },
    ],
  },
  {
    id: "classroom",
    label: "Classroom",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "My Classes", href: "/teacher/classes", icon: BookOpen },
      { label: "My Subjects", href: "/teacher/subjects", icon: BookMarked },
      { label: "Students", href: "/teacher/students", icon: Users },
    ],
  },
];

const STUDENT_NAV: NavGroupDef[] = [
  {
    id: "core",
    label: null,
    collapsible: false,
    defaultOpen: true,
    items: [{ label: "Dashboard", href: "/student", icon: LayoutDashboard, exactMatch: true }],
  },
  {
    id: "academics",
    label: "Academics",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
      { label: "My Subjects", href: "/student/subjects", icon: BookMarked },
      { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
      { label: "Results", href: "/student/results", icon: Award },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    collapsible: true,
    defaultOpen: true,
    items: [{ label: "Fees", href: "/student/fees", icon: Wallet }],
  },
];

const NAV_BY_ROLE: Record<Role, NavGroupDef[]> = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  SCHOOL_ADMIN: SCHOOL_ADMIN_NAV,
  TEACHER: TEACHER_NAV,
  STUDENT: STUDENT_NAV,
  PARENT: [],
};

// ─────────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────────

function NavTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: React.ReactElement;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const show = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.top + rect.height / 2, left: rect.right + 10 });
      setVisible(true);
    }
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  if (!enabled) return children;

  return (
    <div ref={wrapRef} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible &&
        mounted &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[99999] flex items-center px-2.5 py-1.5
              bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 text-xs font-medium
              rounded-lg shadow-xl pointer-events-none whitespace-nowrap
              -translate-y-1/2 animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left }}
          >
            <div
              className="absolute right-full top-1/2 -translate-y-1/2
                w-0 h-0 border-y-[5px] border-y-transparent
                border-r-[5px] border-r-slate-900 dark:border-r-slate-100"
              aria-hidden
            />
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────────

function NavItemRow({
  item,
  collapsed,
  onClick,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exactMatch
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <NavTooltip label={item.label} enabled={collapsed}>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg",
          "text-[13px] font-medium outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
          "focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
          "transition-colors duration-150",
          collapsed ? "justify-center p-2.5" : "px-3 py-2",
          isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="nav-active-bar"
            className="absolute left-0 inset-y-2 w-[3px] rounded-full bg-blue-300"
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}
        <item.icon
          aria-hidden
          className={cn(
            "w-[17px] h-[17px] shrink-0 transition-colors duration-150",
            isActive
              ? "text-white"
              : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
          )}
        />
        {!collapsed && <span className="truncate leading-none">{item.label}</span>}
      </Link>
    </NavTooltip>
  );
}

// ─────────────────────────────────────────────────────────────────
// NAV GROUP
// ─────────────────────────────────────────────────────────────────

function NavGroup({
  group,
  collapsed,
  onItemClick,
}: {
  group: NavGroupDef;
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(group.defaultOpen);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`campus-x-nav-group-${group.id}`);
      if (v !== null) setIsOpen(v === "true");
    } catch {
      /* noop */
    }
  }, [group.id]);

  const toggle = () => {
    if (!group.collapsible) return;
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(`campus-x-nav-group-${group.id}`, String(next));
    } catch {
      /* noop */
    }
  };

  return (
    <div className="mb-1">
      {group.label && !collapsed && (
        <div
          role={group.collapsible ? "button" : undefined}
          tabIndex={group.collapsible ? 0 : undefined}
          onClick={group.collapsible ? toggle : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          aria-expanded={group.collapsible ? isOpen : undefined}
          aria-controls={`nav-group-${group.id}`}
          className={cn(
            "flex items-center justify-between",
            "px-3 py-1.5 mb-0.5 rounded-md",
            "text-[10.5px] font-semibold tracking-widest uppercase",
            "text-slate-400 dark:text-slate-500 leading-none",
            group.collapsible
              ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              : "cursor-default"
          )}
        >
          {group.label}
          {group.collapsible && (
            <motion.span
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              aria-hidden
            >
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          )}
        </div>
      )}

      {group.label && collapsed && (
        <div
          className="my-2.5 mx-3 border-t border-slate-200 dark:border-slate-800"
          aria-hidden
        />
      )}

      <AnimatePresence initial={false}>
        {(isOpen || !group.collapsible) && (
          <motion.div
            id={`nav-group-${group.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className={cn("space-y-0.5", collapsed ? "px-1" : "")}>
              {group.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SEARCH PANEL
// ─────────────────────────────────────────────────────────────────

function SearchPanel({
  groups,
  onClose,
}: {
  groups: NavGroupDef[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const allItems = useMemo(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label }))),
    [groups]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 10);
    return allItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
    );
  }, [query, allItems]);

  useEffect(() => {
    setCursor(0);
  }, [results.length]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setCursor((p) => Math.min(p + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setCursor((p) => Math.max(p - 1, 0));
        break;
      case "Enter":
        if (results[cursor]) {
          router.push(results[cursor].href);
          onClose();
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-2 py-2"
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
            text-slate-400 dark:text-slate-500 pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search navigation…"
          aria-label="Search navigation"
          className="w-full bg-slate-200/70 dark:bg-slate-800/80 rounded-xl
            pl-9 pr-9 py-2.5 text-[13px] text-slate-900 dark:text-white
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-all duration-150"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1
            text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {results.length > 0 ? (
        <div role="listbox" className="flex flex-col gap-0.5">
          {results.map((item, idx) => {
            const isCursor = idx === cursor;
            return (
              <Link
                key={item.href}
                role="option"
                href={item.href}
                onClick={onClose}
                onMouseEnter={() => setCursor(idx)}
                aria-selected={isCursor}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                  "text-[13px] font-medium transition-colors duration-100",
                  isCursor
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon
                  aria-hidden
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isCursor ? "text-white" : "text-slate-400 dark:text-slate-500"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {item.group && (
                  <span className="ml-auto text-[10px] opacity-60 shrink-0">{item.group}</span>
                )}
              </Link>
            );
          })}
        </div>
      ) : query.trim() ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
          No results for &ldquo;{query}&rdquo;
        </p>
      ) : null}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
        ↑↓ navigate · ↵ open · Esc close
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// USER AVATAR
// ─────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: ShellUser }) {
  const initials = (user.name ?? "U")
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? "User"}
        className="w-8 h-8 rounded-full object-cover ring-2
          ring-slate-300 dark:ring-slate-700 shadow shrink-0"
      />
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500
      to-indigo-600 flex items-center justify-center text-white
      text-xs font-bold shrink-0 shadow"
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// INNER SIDEBAR
// ─────────────────────────────────────────────────────────────────

interface InnerProps {
  user: ShellUser;
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

function SidebarInner({ user, collapsed, onToggle, onClose, isMobile = false }: InnerProps) {
  const [searching, setSearching] = useState(false);
  const groups = NAV_BY_ROLE[user.role] ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center shrink-0",
          "border-b border-slate-200/80 dark:border-slate-800/80",
          collapsed && !isMobile ? "flex-col gap-3 py-4 px-0" : "h-[60px] px-4 gap-3"
        )}
      >
        <Link
          href={`/${user.role === "SUPER_ADMIN" ? "super-admin" : user.role.toLowerCase()}`}
          className={cn(
            "flex items-center gap-2.5 min-w-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg",
            collapsed && !isMobile ? "justify-center" : "flex-1"
          )}
          aria-label="Campus-X home"
        >
          <div
            className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600
            rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-black leading-none">C</span>
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-none truncate">
                Campus-X
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none truncate">
                {formatRoleLabel(user.role)}
              </p>
            </div>
          )}
        </Link>

        {!isMobile && (
          <NavTooltip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            enabled={collapsed}
          >
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
                hover:bg-slate-200/70 dark:hover:bg-slate-800
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                transition-colors shrink-0"
            >
              <CollapseIcon className="w-4 h-4" aria-hidden />
            </button>
          </NavTooltip>
        )}

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2">
        <AnimatePresence mode="wait">
          {searching ? (
            <SearchPanel
              key="panel"
              groups={groups}
              onClose={() => setSearching(false)}
            />
          ) : (
            <motion.div
              key="trigger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <NavTooltip label="Search ⌘K" enabled={collapsed && !isMobile}>
                <button
                  type="button"
                  onClick={() => setSearching(true)}
                  aria-label="Search navigation (Ctrl+K)"
                  className={cn(
                    "w-full flex items-center rounded-xl",
                    "bg-slate-200/60 dark:bg-slate-800/80",
                    "hover:bg-slate-200 dark:hover:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700/60",
                    "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                    "transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    collapsed && !isMobile ? "justify-center p-2" : "gap-2.5 px-3 py-2.5"
                  )}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="text-[13px] font-medium flex-1 text-left">Search…</span>
                      <kbd
                        className="text-[10px] bg-slate-300/60 dark:bg-slate-900
                        border border-slate-300 dark:border-slate-700
                        px-1.5 py-0.5 rounded-md font-sans text-slate-500 dark:text-slate-400 shadow-xs"
                      >
                        ⌘K
                      </kbd>
                    </>
                  )}
                </button>
              </NavTooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          collapsed && !isMobile ? "px-1 py-2" : "px-3 py-2"
        )}
      >
        {!searching &&
          groups.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              collapsed={collapsed && !isMobile}
              onItemClick={onClose}
            />
          ))}
      </nav>

      {/* ── Theme switch (expanded only) ─────────────── */}
      {(!collapsed || isMobile) && (
        <div
          className="shrink-0 px-4 py-3 border-t border-slate-200/80
          dark:border-slate-800/80"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Appearance
            </p>
            <ThemeSwitch />
          </div>
        </div>
      )}

      {/* ── Footer / User ────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-t border-slate-200/80 dark:border-slate-800/80",
          collapsed && !isMobile ? "p-2" : "p-3"
        )}
      >
        <NavTooltip label="Settings" enabled={collapsed && !isMobile}>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              "flex items-center rounded-xl group",
              "hover:bg-slate-200/70 dark:hover:bg-slate-800",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              collapsed && !isMobile ? "justify-center p-2" : "gap-3 px-3 py-2.5"
            )}
          >
            <UserAvatar user={user} />
            {(!collapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate leading-none">
                  {user.name ?? "User"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-none">
                  {user.email ?? formatRoleLabel(user.role)}
                </p>
              </div>
            )}
            {(!collapsed || isMobile) && (
              <Settings
                className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300
                shrink-0 transition-colors"
                aria-hidden
              />
            )}
          </Link>
        </NavTooltip>

        {/* Sign out */}
        {(!collapsed || isMobile) && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full mt-1 flex items-center gap-2.5 px-3 py-2
              text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden />
            Sign out
          </button>
        )}

        {collapsed && !isMobile && (
          <NavTooltip label="Sign out" enabled>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full mt-1 flex justify-center p-2
                text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                rounded-xl transition-all duration-150"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          </NavTooltip>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC SIDEBAR
// ─────────────────────────────────────────────────────────────────

export interface SidebarProps {
  user: ShellUser;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export function Sidebar({ user, isOpen, onClose, collapsed, onCollapseToggle }: SidebarProps) {
  const EXPANDED_W = 260;
  const COLLAPSED_W = 72;

  // Dynamic background handling dark and light modes cleanly with transition support
  const sidebarBg = "bg-slate-50 dark:bg-slate-950 transition-colors duration-200";

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        initial={false}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className={cn(
          "relative hidden lg:flex flex-col shrink-0",
          "h-screen sticky top-0 overflow-visible",
          sidebarBg,
          "border-r border-slate-200 dark:border-slate-800/80"
        )}
        aria-label="Desktop navigation"
      >
        <SidebarInner
          user={user}
          collapsed={collapsed}
          onToggle={onCollapseToggle}
        />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden"
              onClick={onClose}
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: -EXPANDED_W }}
              animate={{ x: 0 }}
              exit={{ x: -EXPANDED_W }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className={cn(
                "fixed left-0 top-0 bottom-0 z-40 flex flex-col lg:hidden",
                sidebarBg,
                "border-r border-slate-200 dark:border-slate-800/80",
                "shadow-2xl"
              )}
              style={{ width: EXPANDED_W }}
              aria-label="Mobile navigation"
            >
              <SidebarInner
                user={user}
                collapsed={false}
                onToggle={onCollapseToggle}
                onClose={onClose}
                isMobile
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}