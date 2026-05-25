"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { Role } from "@prisma/client";

export interface ShellUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  schoolId: string | null;
}

interface DashboardShellProps {
  user: ShellUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar
          user={user}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}