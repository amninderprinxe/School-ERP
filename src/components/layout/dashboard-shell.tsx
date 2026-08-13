"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@/components/command-palette/command-palette";
import type { Role } from "@prisma/client";

export interface ShellUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  schoolId: string | null;
  avatarUrl?: string | null;
  unreadNotificationCount?: number;
  currentAcademicYear?: { id: string; name: string } | null;
}

interface Props {
  user: ShellUser;
  children: React.ReactNode;
  currentAcademicYear?: { id: string; name: string } | null;
  unreadNotificationCount?: number;
}

const LS_COLLAPSE_KEY = "campus-x-sidebar-collapsed";

export function DashboardShell({ user, children, currentAcademicYear, unreadNotificationCount }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_COLLAPSE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch { /* noop */ }
    setMounted(true);
  }, []);

  const handleCollapseToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(LS_COLLAPSE_KEY, String(next)); } catch { /* noop */ }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === "Escape" && paletteOpen) setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── SSR placeholder ────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
        <div className="hidden lg:block w-[260px] shrink-0
          bg-slate-900 dark:bg-gray-950 border-r
          border-slate-700/40 dark:border-gray-800/60" />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <div className="h-[60px] bg-white dark:bg-gray-900
            border-b border-gray-100 dark:border-gray-800 shrink-0" />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">

      <Sidebar
        user={user}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapseToggle={handleCollapseToggle}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar
          user={user}
          onMenuClick={() => setMobileOpen((p) => !p)}
          onSearchClick={() => setPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        user={user}
      />
    </div>
  );
}