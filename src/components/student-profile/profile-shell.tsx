"use client";

import { useState }            from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProfileHeader }       from "./header";
import { TabOverview }         from "./tab-overview";
import { TabAttendance }       from "./tab-attendance";
import { TabResults }          from "./tab-results";
import { TabFees }             from "./tab-fees";
import { TabTimetable }        from "./tab-timetable";
import { TabDocuments }        from "./tab-documents";
// import { TabActivity }         from "./tab-activity";
import type { StudentProfileData } from "./types";
import {
  LayoutDashboard, CalendarCheck, Award,
  Wallet, CalendarDays, FileText, Clock,
  type LucideIcon,
}                              from "lucide-react";
import { cn }                  from "@/lib/utils";

type TabId =
  | "overview" | "attendance" | "results"
  | "fees" | "timetable" | "documents" | "activity";

interface TabDef {
  id:    TabId;
  label: string;
  icon:  LucideIcon;
}

const TABS: TabDef[] = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "attendance", label: "Attendance", icon: CalendarCheck   },
  { id: "results",    label: "Results",    icon: Award           },
  { id: "fees",       label: "Fees",       icon: Wallet          },
  { id: "timetable",  label: "Timetable",  icon: CalendarDays    },
  { id: "documents",  label: "Documents",  icon: FileText        },
  { id: "activity",   label: "Activity",   icon: Clock           },
];

export function ProfileShell({ data }: { data: StudentProfileData }) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">

      {/* ── Profile header ──────────────────────────────── */}
      <ProfileHeader data={data} onTabChange={(tab: string) => setActive(tab as TabId)} />

      {/* ── Tab bar ─────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-white border-b border-gray-100
          shadow-[0_1px_0_0_#f3f4f6]"
        role="tablist"
        aria-label="Student profile sections"
      >
        <div className="flex overflow-x-auto px-4 sm:px-6 lg:px-8
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const Icon     = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3.5",
                  "text-[13px] font-semibold whitespace-nowrap shrink-0",
                  "border-b-2 transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-blue-500 focus-visible:ring-inset",
                  isActive
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "w-[15px] h-[15px]",
                    isActive ? "text-blue-600" : "text-gray-400",
                  )}
                />
                {tab.label}
                {/* Active underline spring */}
                {isActive && (
                  <motion.div
                    layoutId="profile-tab-underline"
                    className="absolute bottom-[-1px] left-0 right-0 h-0.5
                      bg-blue-600 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab panels ──────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            id={`tabpanel-${active}`}
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0, y: -10   }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {active === "overview"   && <TabOverview   data={data} />}
            {active === "attendance" && <TabAttendance data={data} />}
            {active === "results"    && <TabResults    data={data} />}
            {active === "fees"       && <TabFees       data={data} />}
            {active === "timetable"  && <TabTimetable  data={data} />}
            {active === "documents"  && <TabDocuments  data={data} />}
            {/* {active === "activity"   && <TabActivity   data={data} />} */}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}