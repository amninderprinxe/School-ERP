"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calendar as CalendarIcon,
  List,
  CalendarOff,
  GraduationCap,
  Wallet,
  CalendarClock,
  PartyPopper,
  Megaphone,
  Loader2,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AddEventModal } from "./add-event-modal";
import type { Role } from "@prisma/client";

// ============================================================
// CONFIG & TYPES
// ============================================================

interface EventType {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EVENT_TYPES: EventType[] = [
  { id: "exam", label: "Exams", color: "#7c3aed", icon: GraduationCap },
  { id: "ptm", label: "PTM", color: "#2563eb", icon: CalendarClock },
  { id: "holiday", label: "Holidays", color: "#dc2626", icon: CalendarOff },
  { id: "birthday", label: "Birthdays", color: "#db2777", icon: PartyPopper },
  { id: "fee", label: "Fee Dues", color: "#d97706", icon: Wallet },
  { id: "school_event", label: "School Events", color: "#059669", icon: CalendarIcon },
  { id: "announcement", label: "Announcements", color: "#0891b2", icon: Megaphone },
];

const VIEW_CFG = [
  { id: "dayGridMonth", label: "Month", icon: CalendarDays },
  { id: "listWeek", label: "Agenda", icon: List },
] as const;

type ViewId = (typeof VIEW_CFG)[number]["id"];

interface ClickedEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  type: string;
  description?: string;
  color?: string;
  extendedProps?: any;
}

interface Props {
  role: Role;
  canCreate: boolean;
}

export function CalendarClient({ role, canCreate }: Props) {
  const mountedRef = useRef(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewId>("dayGridMonth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTypes, setActiveTypes] = useState(new Set(EVENT_TYPES.map((t) => t.id)));
  
  const [events, setEvents] = useState<any[]>([]);
  const [clickedEvent, setClickedEvent] = useState<ClickedEvent | null>(null);
  const [addModalDate, setAddModalDate] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Calculate Date Ranges for Month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Range for API Fetching
  const startDateStr = new Date(year, month, 1 - firstDayOfMonth.getDay()).toISOString();
  const endDateStr = new Date(year, month + 1, 6 - lastDayOfMonth.getDay()).toISOString();

  // Fetch Events API
  const loadEvents = useCallback(async () => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const types = Array.from(activeTypes).join(",");
      const response = await fetch(
        `/api/calendar/events?start=${startDateStr}&end=${endDateStr}&types=${types}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error("Failed to fetch events");

      const data = await response.json();
      if (mountedRef.current) {
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (mountedRef.current) setError("Failed to load events");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [startDateStr, endDateStr, activeTypes]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Navigation handlers
  const nav = (direction: "prev" | "next" | "today") => {
    if (direction === "today") setCurrentDate(new Date());
    else if (direction === "prev") setCurrentDate(new Date(year, month - 1, 1));
    else if (direction === "next") setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTypeToggle = (id: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Generate Calendar Days Grid
  const daysInMonth: Date[] = [];
  const startGridDate = new Date(year, month, 1 - (firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1));
  
  for (let i = 0; i < 35; i++) {
    const day = new Date(startGridDate);
    day.setDate(startGridDate.getDate() + i);
    daysInMonth.push(day);
  }

  const monthLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* HEADER BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => nav("prev")} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => nav("today")} className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700">
              Today
            </button>
            <button onClick={() => nav("next")} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-bold text-gray-900 min-w-[180px] text-lg">{monthLabel}</h2>

          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events..."
                className="pl-9 pr-3 py-2 rounded-xl bg-gray-100 text-sm outline-none w-[220px]"
              />
            </div>

            <button onClick={() => setShowFilters((p) => !p)} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold">
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {canCreate && (
              <button
                onClick={() => {
                  setAddModalDate(new Date().toISOString().split("T")[0]);
                  setAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            )}

            <div className="flex bg-gray-100 rounded-xl p-1">
              {VIEW_CFG.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition",
                      active ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:block">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FILTERS PANEL */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-4 mt-4 border-t flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = activeTypes.has(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeToggle(type.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border transition",
                        active ? "text-white border-transparent" : "text-gray-500"
                      )}
                      style={active ? { backgroundColor: type.color } : {}}
                    >
                      {active && <Check className="w-3 h-3" />}
                      <Icon className="w-3 h-3" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={loadEvents} className="ml-auto">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CALENDAR BODY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-h-[520px]">
        {view === "dayGridMonth" ? (
          <div>
            {/* Days Header */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-gray-400 border-b pb-2 mb-2">
              <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div>SUN</div>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-7 gap-1 auto-rows-fr">
              {daysInMonth.map((day, idx) => {
                const dateStr = day.toISOString().split("T")[0];
                const isCurrentMonth = day.getMonth() === month;
                const isToday = day.toDateString() === new Date().toDateString();

                // Filter events for this day
                const dayEvents = events.filter((e) => {
                  if (!e.start) return false;
                  const eDate = e.start.split("T")[0];
                  const matchesSearch = !query || e.title?.toLowerCase().includes(query.toLowerCase());
                  return eDate === dateStr && matchesSearch;
                });

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (canCreate) {
                        setAddModalDate(dateStr);
                        setAddModalOpen(true);
                      }
                    }}
                    className={cn(
                      "min-h-[100px] border border-gray-100 rounded-xl p-2 flex flex-col justify-between transition cursor-pointer hover:bg-gray-50",
                      !isCurrentMonth && "opacity-30 bg-gray-50/50",
                      isToday && "bg-blue-50/40 border-blue-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center", isToday ? "bg-blue-600 text-white" : "text-gray-700")}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Events List for Day */}
                    <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px]">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClickedEvent(ev);
                          }}
                          className="px-2 py-1 rounded text-[11px] font-semibold text-white truncate shadow-sm hover:opacity-90 transition"
                          style={{ backgroundColor: ev.color || "#2563eb" }}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Agenda / List View */
          <div className="divide-y divide-gray-100">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No events found</div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ev.color || "#2563eb" }} />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{ev.title}</h4>
                      <p className="text-xs text-gray-400">{ev.start?.split("T")[0]}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ADD EVENT MODAL */}
      <AddEventModal
        open={addModalOpen}
        defaultDate={addModalDate}
        onClose={() => {
          setAddModalOpen(false);
          setAddModalDate(null);
        }}
        onSuccess={() => {
          setAddModalOpen(false);
          setAddModalDate(null);
          loadEvents();
        }}
      />
    </div>
  );
}