"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
}                                      from "react";
import { useRouter, usePathname }      from "next/navigation";
import { createPortal }                from "react-dom";
import { motion, AnimatePresence }     from "framer-motion";
import {
  Search, X, Clock, ArrowRight,
  Loader2, GraduationCap, UserCheck,
  Users, BookOpen, BookMarked,
  ClipboardList, CalendarDays, CalendarCheck,
  Wallet, Megaphone, Bell, LayoutDashboard,
  TrendingUp, Award, ShieldCheck,
  Building2, CalendarClock, Layers,
  Upload, ClipboardCheck, CalendarOff,
  type LucideIcon,
}                                      from "lucide-react";
import { cn }                          from "@/lib/utils";
import type { Role }                   from "@prisma/client";
import type { ShellUser }             from "@/components/layout/dashboard-shell";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface SearchItem {
  id:        string;
  title:     string;
  subtitle?: string;
  href:      string;
  type:      string;
}

interface SearchGroup {
  id:    string;
  label: string;
  items: SearchItem[];
}

interface RecentItem extends SearchItem {
  timestamp: number;
}

interface QuickAction {
  id:      string;
  title:   string;
  href:    string;
  icon:    LucideIcon;
  kbd?:    string;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const LS_KEY       = "campus-x-recent-commands";
const MAX_RECENT   = 8;
const DEBOUNCE_MS  = 180;

// ─────────────────────────────────────────────────────────────────
// TYPE → ICON / COLORS
// ─────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<
  string,
  { icon: LucideIcon; bg: string; text: string }
> = {
  student:      { icon: GraduationCap, bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-600 dark:text-blue-400" },
  teacher:      { icon: UserCheck, bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-600 dark:text-green-400" },
  class:        { icon: BookOpen, bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-600 dark:text-purple-400" },
  subject:      { icon: BookMarked, bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-600 dark:text-indigo-400" },
  exam:         { icon: ClipboardList, bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400" },
  fee:          { icon: Wallet, bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
  announcement: { icon: Megaphone, bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-600 dark:text-pink-400" },
  page:         { icon: LayoutDashboard, bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-400" },
};

function getTypeCfg(type: string) {
  return TYPE_CFG[type] ?? TYPE_CFG["page"]!;
}

// ─────────────────────────────────────────────────────────────────
// QUICK ACTIONS BY ROLE
// ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  SCHOOL_ADMIN: [
    { id: "dashboard",    title: "Dashboard",        href: "/school-admin",                  icon: LayoutDashboard  },
    { id: "students",     title: "Students",          href: "/school-admin/students",          icon: GraduationCap    },
    { id: "teachers",     title: "Teachers",          href: "/school-admin/teachers",          icon: UserCheck        },
    { id: "classes",      title: "Classes",           href: "/school-admin/classes",           icon: BookOpen         },
    { id: "subjects",     title: "Subjects",          href: "/school-admin/subjects",          icon: BookMarked       },
    { id: "exams",        title: "Exams",             href: "/school-admin/exams",             icon: ClipboardList    },
    { id: "timetable",   title: "Timetable",          href: "/school-admin/timetable",         icon: CalendarDays     },
    { id: "attendance",  title: "Attendance",         href: "/school-admin/attendance",        icon: CalendarCheck    },
    { id: "fees",         title: "Fees",              href: "/school-admin/fees",              icon: Wallet           },
    { id: "holidays",     title: "Holidays",          href: "/school-admin/holidays",          icon: CalendarOff      },
    { id: "ptm",          title: "PTM",               href: "/school-admin/ptm",               icon: CalendarClock    },
    { id: "promote",      title: "Promote Students",  href: "/school-admin/promote",           icon: TrendingUp       },
    { id: "import",       title: "Import",            href: "/school-admin/import",            icon: Upload           },
    { id: "audit",        title: "Audit Log",         href: "/school-admin/audit-logs",        icon: ShieldCheck      },
    { id: "years",        title: "Academic Years",    href: "/school-admin/academic-years",    icon: CalendarDays     },
    { id: "results",      title: "Results",           href: "/school-admin/results",           icon: ClipboardCheck   },
    { id: "announcements",title: "Announcements",     href: "/school-admin/announcements",     icon: Megaphone        },
  ],
  TEACHER: [
    { id: "dashboard",  title: "Dashboard",          href: "/teacher",              icon: LayoutDashboard },
    { id: "timetable",  title: "My Timetable",       href: "/teacher/timetable",   icon: CalendarDays    },
    { id: "attendance", title: "Mark Attendance",    href: "/teacher/attendance",  icon: CalendarCheck   },
    { id: "results",    title: "Enter Results",      href: "/teacher/results",     icon: ClipboardList   },
    { id: "ptm",        title: "My PTM",             href: "/teacher/ptm",         icon: CalendarClock   },
    { id: "students",   title: "My Students",        href: "/teacher/students",    icon: Users           },
    { id: "subjects",   title: "My Subjects",        href: "/teacher/subjects",    icon: BookMarked      },
    { id: "classes",    title: "My Classes",         href: "/teacher/classes",     icon: BookOpen        },
  ],
  STUDENT: [
    { id: "dashboard",  title: "Dashboard",          href: "/student",             icon: LayoutDashboard },
    { id: "timetable",  title: "My Timetable",       href: "/student/timetable",  icon: CalendarDays    },
    { id: "attendance", title: "My Attendance",      href: "/student/attendance", icon: CalendarCheck   },
    { id: "results",    title: "My Results",         href: "/student/results",    icon: Award           },
    { id: "fees",       title: "My Fees",            href: "/student/fees",       icon: Wallet          },
    { id: "subjects",   title: "My Subjects",        href: "/student/subjects",   icon: BookMarked      },
  ],
  PARENT: [],
  SUPER_ADMIN: [
    { id: "dashboard",  title: "Dashboard",          href: "/super-admin",               icon: LayoutDashboard },
    { id: "schools",    title: "All Schools",        href: "/super-admin/schools",       icon: Building2       },
    { id: "users",      title: "All Users",          href: "/super-admin/users",         icon: Users           },
    { id: "audit",      title: "Audit Log",          href: "/super-admin/audit-logs",    icon: ShieldCheck     },
  ],
};

// ─────────────────────────────────────────────────────────────────
// NAVIGATION PAGE SEARCH — filter quick actions client-side
// ─────────────────────────────────────────────────────────────────

function searchPages(query: string, role: Role): SearchItem[] {
  if (!query) return [];
  const q      = query.toLowerCase();
  const pages  = QUICK_ACTIONS[role] ?? [];
  return pages
    .filter((p) => p.title.toLowerCase().includes(q))
    .slice(0, 4)
    .map((p) => ({
      id:    `page-${p.id}`,
      title: p.title,
      href:  p.href,
      type:  "page",
    }));
}

// ─────────────────────────────────────────────────────────────────
// HIGHLIGHT — wraps matching chars in a styled span
// ─────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(`(${escaped})`, "gi");
  const parts   = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-blue-100 dark:bg-blue-800/60 text-blue-700
              dark:text-blue-300 rounded-[3px] px-[1px] not-italic font-semibold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="px-2 py-2 space-y-1" aria-hidden="true">
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-3
        ml-2 animate-pulse" />
      {[0.9, 0.7, 0.85].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        >
          <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700
            animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              style={{ width: `${w * 100}%` }}
            />
            <div className="h-2 w-1/2 bg-gray-100 dark:bg-gray-800 rounded
              animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RESULT ITEM — single row
// ─────────────────────────────────────────────────────────────────

interface ResultItemProps {
  item:      SearchItem;
  query:     string;
  isActive:  boolean;
  onSelect:  () => void;
  onMouseEnter: () => void;
}

function ResultItem({
  item, query, isActive, onSelect, onMouseEnter,
}: ResultItemProps) {
  const cfg = getTypeCfg(item.type);
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "text-left outline-none transition-colors duration-100 group",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/25"
          : "hover:bg-gray-100/80 dark:hover:bg-gray-800/60",
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          cfg.bg,
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", cfg.text)} aria-hidden />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] font-medium leading-snug truncate",
            isActive
              ? "text-blue-700 dark:text-blue-300"
              : "text-gray-900 dark:text-gray-100",
          )}
        >
          <Highlight text={item.title} query={query} />
        </p>
        {item.subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500
            truncate mt-0.5 leading-none">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Arrow on hover/active */}
      <ArrowRight
        className={cn(
          "w-3.5 h-3.5 shrink-0 transition-all duration-150",
          isActive
            ? "text-blue-500 translate-x-0.5"
            : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100",
        )}
        aria-hidden
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// QUICK ACTION ITEM — used in no-query state
// ─────────────────────────────────────────────────────────────────

function QuickActionItem({
  action, isActive, onSelect, onMouseEnter,
}: {
  action: QuickAction;
  isActive: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isActive}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "text-left outline-none transition-colors duration-100",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/25"
          : "hover:bg-gray-100/80 dark:hover:bg-gray-800/60",
      )}
    >
      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800
        flex items-center justify-center shrink-0">
        <Icon
          className={cn(
            "w-3.5 h-3.5",
            isActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400",
          )}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "text-[13px] font-medium flex-1 text-left",
          isActive
            ? "text-blue-700 dark:text-blue-300"
            : "text-gray-800 dark:text-gray-200",
        )}
      >
        {action.title}
      </span>
      {action.kbd && (
        <kbd className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800
          text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded border
          border-gray-200 dark:border-gray-700">
          {action.kbd}
        </kbd>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// RECENT ITEM
// ─────────────────────────────────────────────────────────────────

function RecentItemRow({
  item, isActive, onSelect, onMouseEnter, onRemove,
}: {
  item: RecentItem;
  isActive: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const cfg = getTypeCfg(item.type);
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "transition-colors duration-100 group",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/25"
          : "hover:bg-gray-100/80 dark:hover:bg-gray-800/60",
      )}
    >
      {/* Clock icon */}
      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800
        flex items-center justify-center shrink-0">
        <Clock
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
          aria-hidden
        />
      </div>

      {/* Button area */}
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onMouseEnter}
        role="option"
        aria-selected={isActive}
        className="flex-1 min-w-0 text-left outline-none"
      >
        <p
          className={cn(
            "text-[13px] font-medium truncate leading-snug",
            isActive
              ? "text-blue-700 dark:text-blue-300"
              : "text-gray-800 dark:text-gray-200",
          )}
        >
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate
            mt-0.5 leading-none">
            {item.subtitle}
          </p>
        )}
      </button>

      {/* Type chip */}
      <span
        className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize",
          "hidden group-hover:inline-flex items-center",
          cfg.bg, cfg.text,
        )}
      >
        {item.type}
      </span>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.title} from recents`}
        className="p-1 rounded-lg text-gray-300 dark:text-gray-600
          hover:text-gray-500 dark:hover:text-gray-400
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition-colors focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <X className="w-3 h-3" aria-hidden />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// GROUP HEADER
// ─────────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1 pt-2">
      <p className="text-[10.5px] font-semibold tracking-widest uppercase
        text-gray-400 dark:text-gray-500 leading-none">
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl
        flex items-center justify-center mb-3">
        <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
        No results found
      </p>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1 text-center">
        No matches for{" "}
        <span className="font-medium text-gray-600 dark:text-gray-400">
          &ldquo;{query}&rdquo;
        </span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────

function PaletteFooter() {
  const keys = [
    { label: "navigate", keys: ["↑", "↓"] },
    { label: "open",     keys: ["↵"]       },
    { label: "close",    keys: ["Esc"]     },
  ];
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-t
      border-gray-100 dark:border-gray-800">
      {keys.map((k) => (
        <div key={k.label} className="flex items-center gap-1.5">
          {k.keys.map((key) => (
            <kbd
              key={key}
              className="inline-flex items-center justify-center
                min-w-[20px] h-5 px-1 text-[10px] font-medium
                bg-gray-100 dark:bg-gray-800
                text-gray-500 dark:text-gray-400
                border border-gray-200 dark:border-gray-700
                rounded shadow-sm"
            >
              {key}
            </kbd>
          ))}
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {k.label}
          </span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[10px] text-gray-300 dark:text-gray-600">
          Campus-X
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  open:     boolean;
  onClose:  () => void;
  user:     ShellUser;
}

export function CommandPalette({ open, onClose, user }: CommandPaletteProps) {
  const router   = useRouter();
  const pathname = usePathname();

  // ── State ─────────────────────────────────────────────────────
  const [query,       setQuery]       = useState("");
  const [groups,      setGroups]      = useState<SearchGroup[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [recent,      setRecent]      = useState<RecentItem[]>([]);
  const [mounted,     setMounted]     = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Refs
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount guard ───────────────────────────────────────────────
  useEffect(() => setMounted(true), []);

  // ── Load recents from localStorage ───────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRecent(JSON.parse(raw) as RecentItem[]);
    } catch { /* noop */ }
  }, []);

  // ── Close on navigation ───────────────────────────────────────
  useEffect(() => {
    if (open) onClose();
  }, [pathname]); // eslint-disable-line

  // ── Focus input when opened ───────────────────────────────────
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    } else {
      setQuery("");
      setGroups([]);
      setLoading(false);
      setActiveIndex(0);
    }
  }, [open]);

  // ── Search ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setGroups([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `/api/command-search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        const data = await res.json() as { groups: SearchGroup[] };

        // Prepend page results
        const pageItems = searchPages(q, user.role);
        const allGroups: SearchGroup[] = [];
        if (pageItems.length > 0) {
          allGroups.push({ id: "pages", label: "Pages", items: pageItems });
        }
        allGroups.push(...data.groups);

        setGroups(allGroups);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
        setActiveIndex(0);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user.role]);

  // ── Flat list of all selectable items ─────────────────────────

  type SelectableItem =
    | { kind: "recent";  item: RecentItem;  index: number }
    | { kind: "action";  item: QuickAction; index: number }
    | { kind: "result";  item: SearchItem;  groupId: string; index: number };

  const flatItems = useMemo((): SelectableItem[] => {
    const items: SelectableItem[] = [];
    let idx = 0;

    if (!query.trim()) {
      // Recent
      for (const item of recent) {
        items.push({ kind: "recent", item, index: idx++ });
      }
      // Quick actions
      const actions = QUICK_ACTIONS[user.role] ?? [];
      for (const action of actions.slice(0, 8)) {
        items.push({ kind: "action", item: action, index: idx++ });
      }
    } else {
      // Search results
      for (const group of groups) {
        for (const item of group.items) {
          items.push({ kind: "result", item, groupId: group.id, index: idx++ });
        }
      }
    }

    return items;
  }, [query, recent, groups, user.role]);

  const totalItems = flatItems.length;

  // ── Scroll active item into view ──────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-active-index="${activeIndex}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Handle select ─────────────────────────────────────────────
  const handleSelect = useCallback(
    (item: SearchItem) => {
      // Save to recent
      const newRecent: RecentItem = {
        ...item,
        timestamp: Date.now(),
      };
      const updated = [
        newRecent,
        ...recent.filter((r) => r.id !== item.id),
      ].slice(0, MAX_RECENT);
      setRecent(updated);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* noop */ }

      router.push(item.href);
      onClose();
    },
    [recent, router, onClose],
  );

  const handleSelectByIndex = useCallback(
    (idx: number) => {
      const entry = flatItems[idx];
      if (!entry) return;
      if (entry.kind === "recent" || entry.kind === "result") {
        handleSelect(entry.item);
      } else if (entry.kind === "action") {
        handleSelect({
          id:    entry.item.id,
          title: entry.item.title,
          href:  entry.item.href,
          type:  "page",
        });
      }
    },
    [flatItems, handleSelect],
  );

  // ── Remove recent ─────────────────────────────────────────────
  const removeRecent = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = recent.filter((r) => r.id !== id);
      setRecent(updated);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* noop */ }
    },
    [recent],
  );

  // ── Keyboard handler ──────────────────────────────────────────
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((p) => (p + 1) % Math.max(1, totalItems));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((p) =>
          p === 0 ? Math.max(0, totalItems - 1) : p - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        handleSelectByIndex(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // ── Clear recents ─────────────────────────────────────────────
  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (!mounted) return null;

  const showEmpty     = query.trim() && !loading && groups.length === 0;
  const showSkeleton  = loading;
  const hasQuery      = !!query.trim();
  const quickActions  = (QUICK_ACTIONS[user.role] ?? []).slice(0, 8);

  const palette = (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60
              backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Modal ───────────────────────────────────── */}
          <div
            className="fixed inset-0 z-50 flex items-start justify-center
              px-4 pt-[10vh] sm:pt-[13vh]"
            aria-label="Command palette"
          >
            <motion.div
              key="palette"
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1,    y: 0   }}
              exit={{ opacity: 0,   scale: 0.96, y: -12  }}
              transition={{
                type:      "spring",
                stiffness: 380,
                damping:   28,
                mass:      0.8,
              }}
              className="relative w-full max-w-[580px] flex flex-col
                bg-white dark:bg-gray-900
                rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.18)]
                dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]
                border border-gray-200/80 dark:border-gray-700/80
                overflow-hidden"
              style={{ maxHeight: "min(560px, 80vh)" }}
              onKeyDown={handleKeyDown}
            >
              {/* ── Search input ──────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b
                border-gray-100 dark:border-gray-800 shrink-0">
                {loading ? (
                  <Loader2
                    className="w-4 h-4 text-blue-500 animate-spin shrink-0"
                    aria-hidden
                  />
                ) : (
                  <Search
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
                    aria-hidden
                  />
                )}

                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-expanded={flatItems.length > 0}
                  aria-autocomplete="list"
                  aria-controls="command-list"
                  aria-activedescendant={
                    flatItems[activeIndex]
                      ? `cmd-item-${activeIndex}`
                      : undefined
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students, teachers, classes…"
                  className="flex-1 bg-transparent text-[15px] font-medium
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-600
                    outline-none leading-none"
                  spellCheck={false}
                  autoComplete="off"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                    aria-label="Clear search"
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600
                      dark:hover:text-gray-300 hover:bg-gray-100
                      dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-2 py-1
                    text-[11px] font-medium text-gray-400 dark:text-gray-500
                    bg-gray-100 dark:bg-gray-800 border border-gray-200
                    dark:border-gray-700 rounded-lg leading-none">
                    Esc
                  </kbd>
                )}
              </div>

              {/* ── Result list ───────────────────────── */}
              <div
                id="command-list"
                ref={listRef}
                role="listbox"
                aria-label="Search results"
                className="flex-1 overflow-y-auto overscroll-contain
                  scroll-py-2"
              >
                {/* Loading skeleton */}
                {showSkeleton && <SearchSkeleton />}

                {/* Empty state */}
                {!showSkeleton && showEmpty && (
                  <EmptyState query={query} />
                )}

                {/* ── No query: Recent + Quick Actions ── */}
                {!hasQuery && !showSkeleton && (
                  <div className="px-2 py-2">

                    {/* Recent searches */}
                    {recent.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between px-3 pb-1 pt-1">
                          <p className="text-[10.5px] font-semibold tracking-widest
                            uppercase text-gray-400 dark:text-gray-500">
                            Recent
                          </p>
                          <button
                            type="button"
                            onClick={clearRecent}
                            className="text-[10px] text-gray-400 hover:text-gray-600
                              dark:hover:text-gray-300 transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                        {recent.map((item) => {
                          const idx    = flatItems.findIndex(
                            (f) => f.kind === "recent" && f.item.id === item.id,
                          );
                          return (
                            <RecentItemRow
                              key={item.id}
                              item={item}
                              isActive={idx === activeIndex}
                              onSelect={() => handleSelect(item)}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onRemove={(e) => removeRecent(item.id, e)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div>
                      <GroupHeader label="Quick Navigation" />
                      {quickActions.map((action) => {
                        const idx = flatItems.findIndex(
                          (f) => f.kind === "action" && f.item.id === action.id,
                        );
                        return (
                          <QuickActionItem
                            key={action.id}
                            action={action}
                            isActive={idx === activeIndex}
                            onSelect={() =>
                              handleSelect({
                                id:    action.id,
                                title: action.title,
                                href:  action.href,
                                type:  "page",
                              })
                            }
                            onMouseEnter={() => setActiveIndex(idx)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Search results ─────────────────── */}
                {hasQuery && !showSkeleton && !showEmpty && (
                  <div className="px-2 py-2">
                    {groups.map((group) => (
                      <div key={group.id} className="mb-2 last:mb-0">
                        <GroupHeader label={group.label} />
                        {group.items.map((item) => {
                          const idx = flatItems.findIndex(
                            (f) =>
                              f.kind === "result" &&
                              f.item.id === item.id &&
                              (f as Extract<SelectableItem, {kind:"result"}>).groupId === group.id,
                          );
                          return (
                            <ResultItem
                              key={`${group.id}-${item.id}`}
                              item={item}
                              query={query}
                              isActive={idx === activeIndex}
                              onSelect={() => handleSelect(item)}
                              onMouseEnter={() => setActiveIndex(idx)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Footer ────────────────────────────── */}
              <PaletteFooter />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(palette, document.body);
}