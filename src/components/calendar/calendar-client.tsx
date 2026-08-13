"use client";

import { useRef, useState, useCallback, useEffect } from "react";

import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

import type { EventInput } from "@fullcalendar/core";

import { motion, AnimatePresence } from "framer-motion";

import {
  Search,
  Filter,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calendar,
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
// EVENT MODAL FALLBACK
// ============================================================

interface EventModalProps {
  event: ClickedEvent | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const EventModal: React.FC<EventModalProps> = () => null;

// ============================================================
// CONFIG
// ============================================================

interface EventType {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

const EVENT_TYPES: EventType[] = [
  {
    id: "exam",
    label: "Exams",
    color: "#7c3aed",
    icon: GraduationCap,
  },
  {
    id: "ptm",
    label: "PTM",
    color: "#2563eb",
    icon: CalendarClock,
  },
  {
    id: "holiday",
    label: "Holidays",
    color: "#dc2626",
    icon: CalendarOff,
  },
  {
    id: "birthday",
    label: "Birthdays",
    color: "#db2777",
    icon: PartyPopper,
  },
  {
    id: "fee",
    label: "Fee Dues",
    color: "#d97706",
    icon: Wallet,
  },
  {
    id: "school_event",
    label: "School Events",
    color: "#059669",
    icon: Calendar,
  },
  {
    id: "announcement",
    label: "Announcements",
    color: "#0891b2",
    icon: Megaphone,
  },
];

const VIEW_CFG = [
  {
    id: "dayGridMonth",
    label: "Month",
    icon: CalendarDays,
  },
  {
    id: "timeGridWeek",
    label: "Week",
    icon: Calendar,
  },
  {
    id: "listWeek",
    label: "Agenda",
    icon: List,
  },
] as const;

type ViewId = (typeof VIEW_CFG)[number]["id"];

// ============================================================
// TYPES
// ============================================================

interface ClickedEvent {
  id: string;
  title: string;

  start: string;
  end?: string;

  allDay: boolean;

  type: string;

  description?: string;

  examType?: string;

  teacher?: string;
  student?: string;
  parent?: string;

  amount?: number;

  status?: string;

  editable?: boolean;

  entityId?: string;

  createdBy?: string;

  notes?: string;

  holidayType?: string;

  academicYear?: string;

  booked?: boolean;

  section?: string;

  color?: string;
}

interface Props {
  role: Role;
  canCreate: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function CalendarClient({ role, canCreate }: Props) {
  const calRef = useRef<any>(null);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================================
  // STATES
  // ============================================================

  const [view, setView] = useState<ViewId>("dayGridMonth");

  const [titleLabel, setTitleLabel] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [activeTypes, setActiveTypes] = useState(
    new Set(EVENT_TYPES.map((t) => t.id)),
  );

  const [clickedEvent, setClickedEvent] = useState<ClickedEvent | null>(null);

  const [addModalDate, setAddModalDate] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);

  // ============================================================
  // FETCH EVENTS (FIXED)
  // ============================================================

  const fetchEvents = useCallback(
    async (
      fetchInfo: any,
      successCallback: (events: EventInput[]) => void,

      failureCallback: (error: Error) => void,
    ) => {
      try {
        if (mountedRef.current) {
          setLoading(true);
          setError(null);
        }

        const types = Array.from(activeTypes).join(",");

        const response = await fetch(
          `/api/calendar/events?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}&types=${types}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch calendar events");
        }

        const data = await response.json();

        if (!mountedRef.current) {
          return;
        }

        successCallback(data);
      } catch (err) {
        console.error("Calendar fetch error:", err);

        if (!mountedRef.current) {
          return;
        }

        const error = err instanceof Error ? err : new Error("Unknown error");

        failureCallback(error);

        setError("Failed to load calendar events");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },

    [activeTypes],
  );

  // ============================================================
  // REFRESH EVENTS
  // ============================================================

  const refetch = useCallback(() => {
    calRef.current?.getApi().refetchEvents();
  }, []);

  // ============================================================
  // SEARCH FILTER
  // ============================================================

  const filterEvent = useCallback(
    (event: any) => {
      if (!query.trim()) {
        return true;
      }

      const q = query.toLowerCase();

      return (
        event.title?.toLowerCase().includes(q) ||
        event.extendedProps?.description?.toLowerCase()?.includes(q)
      );
    },

    [query],
  );

  // ============================================================
  // EVENT CLICK
  // ============================================================

  const handleEventClick = useCallback(
    (info: any) => {
      info.jsEvent.preventDefault();

      const props = info.event.extendedProps;

      setClickedEvent({
        id: info.event.id,

        title: info.event.title,

        start: info.event.startStr,

        end: info.event.endStr || undefined,

        allDay: info.event.allDay,

        color: info.event.backgroundColor || "#374151",

        type: props?.type || "",

        ...props,
      });
    },

    [],
  );

  // ============================================================
  // DATE CLICK
  // ============================================================

  const handleDateClick = useCallback(
    (info: any) => {
      if (!canCreate) {
        return;
      }

      setAddModalDate(info.dateStr);

      setAddModalOpen(true);
    },

    [canCreate],
  );

  // ============================================================
  // EVENT DROP
  // ============================================================

  const handleEventDrop = useCallback(
    async (info: any) => {
      if (!info.event.extendedProps?.editable) {
        info.revert();

        return;
      }

      try {
        const response = await fetch(`/api/calendar/events/${info.event.id}`, {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            startDate: info.event.startStr,

            endDate: info.event.endStr || null,

            allDay: info.event.allDay,
          }),
        });

        if (!response.ok) {
          info.revert();
        }
      } catch {
        info.revert();
      }
    },

    [],
  );

  // ============================================================
  // EVENT RESIZE
  // ============================================================

  const handleEventResize = useCallback(
    async (info: any) => {
      if (!info.event.extendedProps?.editable) {
        info.revert();

        return;
      }

      try {
        const response = await fetch(`/api/calendar/events/${info.event.id}`, {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            startDate: info.event.startStr,

            endDate: info.event.endStr,

            allDay: info.event.allDay,
          }),
        });

        if (!response.ok) {
          info.revert();
        }
      } catch {
        info.revert();
      }
    },

    [],
  );

  // ============================================================
  // DATE RANGE CHANGE
  // ============================================================

  const handleDatesSet = useCallback(
    (info: any) => {
      if (!mountedRef.current) {
        return;
      }

      setTitleLabel(info.view.title);
    },

    [],
  );

  // ============================================================
  // NAVIGATION
  // ============================================================

  const nav = (direction: "prev" | "next" | "today") => {
    const api = calRef.current?.getApi();

    if (!api) {
      return;
    }

    if (direction === "prev") {
      api.prev();
    }

    if (direction === "next") {
      api.next();
    }

    if (direction === "today") {
      api.today();
    }
  };

  // ============================================================
  // CHANGE VIEW
  // ============================================================

  const changeView = (newView: ViewId) => {
    setView(newView);

    calRef.current?.getApi().changeView(newView);
  };

  // ============================================================
  // FILTER TYPES
  // ============================================================

  const toggleType = (id: string) => {
    setActiveTypes((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleTypeToggle = (id: string) => {
    toggleType(id);

    setTimeout(
      () => {
        refetch();
      },

      100,
    );
  };

  // ============================================================
  // ADD SUCCESS
  // ============================================================

  const handleAddSuccess = () => {
    setAddModalOpen(false);

    setAddModalDate(null);

    refetch();
  };

  // ============================================================
  // DELETE EVENT
  // ============================================================

  const handleDelete = async (eventId: string) => {
    try {
      await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });

      setClickedEvent(null);

      refetch();
    } catch {
      console.error("Delete failed");
    }
  };

  // ============================================================
  // JSX STARTS IN PART 3
  // ============================================================

  return (
    <div className="flex flex-col gap-4 pb-8">
      <style>
        {`
        .fc {
          font-family: inherit;
        }

        .fc .fc-toolbar {
          display:none!important;
        }

        .fc .fc-view-harness {
          background:white;
        }

        .fc .fc-daygrid-day:hover {
          background:#f9fafb;
        }

        .fc .fc-daygrid-day.fc-day-today {
          background:#eff6ff;
        }

        .fc .fc-daygrid-day-number {
          font-size:13px;
          font-weight:500;
          padding:8px;
        }

        .fc .fc-event {
          border-radius:6px;
          border:none;
          padding:2px 5px;
          font-size:11px;
          font-weight:600;
          cursor:pointer;
        }

        .fc .fc-scrollgrid {
          border:none;
        }

        .fc td,
        .fc th {
          border-color:#f3f4f6;
        }
        `}
      </style>

      {/* HEADER */}

      <div
        className="
        bg-white rounded-2xl border border-gray-100
        shadow-sm p-4
        "
      >
        <div
          className="
          flex flex-wrap items-center gap-3
          "
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => nav("prev")}
              className="
              p-2 rounded-xl
              hover:bg-gray-100
              "
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => nav("today")}
              className="
              px-4 py-2
              rounded-xl
              text-sm font-semibold
              bg-blue-50 text-blue-700
              "
            >
              Today
            </button>

            <button
              onClick={() => nav("next")}
              className="
              p-2 rounded-xl
              hover:bg-gray-100
              "
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2
            className="
            font-bold text-gray-900
            min-w-[180px]
            "
          >
            {titleLabel}
          </h2>

          {loading && (
            <Loader2
              className="
                w-4 h-4
                animate-spin
                text-blue-600
                "
            />
          )}

          <div
            className="
            flex items-center gap-2
            ml-auto flex-wrap
            "
          >
            {/* SEARCH */}

            <div className="relative">
              <Search
                className="
                absolute left-3 top-1/2
                -translate-y-1/2
                w-4 h-4 text-gray-400
                "
              />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events..."
                className="
                pl-9 pr-3 py-2
                rounded-xl
                bg-gray-100
                text-sm
                outline-none
                w-[220px]
                "
              />
            </div>

            {/* FILTER BUTTON */}

            <button
              onClick={() => setShowFilters((p) => !p)}
              className="
              flex items-center gap-2
              px-4 py-2
              rounded-xl
              border
              text-sm font-semibold
              "
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {canCreate && (
              <button
                onClick={() => {
                  setAddModalDate(null);

                  setAddModalOpen(true);
                }}
                className="
                  flex items-center gap-2
                  px-4 py-2
                  rounded-xl
                  bg-blue-600
                  text-white
                  text-sm font-semibold
                  "
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            )}

            {/* VIEW SWITCH */}

            <div
              className="
              flex bg-gray-100
              rounded-xl p-1
              "
            >
              {VIEW_CFG.map((item) => {
                const Icon = item.icon;

                const active = view === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => changeView(item.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1",

                      active ? "bg-white shadow-sm" : "text-gray-500",
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

        {/* FILTER PANEL */}

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              className="overflow-hidden"
            >
              <div
                className="
                pt-4 mt-4
                border-t
                flex flex-wrap gap-2
                "
              >
                {EVENT_TYPES.map((type) => {
                  const Icon = type.icon;

                  const active = activeTypes.has(type.id);

                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeToggle(type.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border",

                        active
                          ? "text-white border-transparent"
                          : "text-gray-500",
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: type.color,
                            }
                          : {}
                      }
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

      {/* ERROR */}

      {error && (
        <div
          className="
            flex items-center gap-3
            bg-red-50
            border border-red-200
            rounded-xl p-4
            "
        >
          <AlertTriangle className="text-red-500" />

          <span
            className="
              text-sm text-red-600
              "
          >
            {error}
          </span>

          <button
            onClick={refetch}
            className="
              ml-auto
              text-red-600
              "
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CALENDAR */}

      <div
        className="
        bg-white
        rounded-2xl
        border
        shadow-sm
        overflow-hidden
        "
      >
        <FullCalendar
          ref={calRef}
          plugins={[
            dayGridPlugin as any,
            timeGridPlugin as any,
            listPlugin as any,
            interactionPlugin as any,
          ]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={(...args: any[]) => {
            // wrap to avoid FullCalendar/React type mismatches and allow async fetchEvents
            try {
              const res = (fetchEvents as any)(...args);
              if (res && typeof res.catch === "function") {
                res.catch((err: any) => {
                  const failure = args[2];
                  if (typeof failure === "function") failure(err);
                });
              }
            } catch (err) {
              const failure = args[2];
              if (typeof failure === "function") failure(err as Error);
            }
          }}
          eventClick={handleEventClick}
          dateClick={canCreate ? handleDateClick : undefined}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          editable={canCreate}
          selectable={canCreate}
          dayMaxEvents={4}
          height="auto"
          contentHeight={680}
          firstDay={1}
          eventDidMount={(info) => {
            if (!query) return;

            const hit = filterEvent(info.event);

            if (!hit) {
              info.el.style.opacity = "0.25";
            }
          }}
          loading={(isLoading) => {
            if (mountedRef.current) {
              setLoading(isLoading);
            }
          }}
        />
      </div>

      {/* EVENT MODAL */}

      <EventModal
        event={clickedEvent}
        onClose={() => setClickedEvent(null)}
        onDelete={canCreate ? handleDelete : undefined}
      />

      {/* ADD EVENT */}

      <AddEventModal
        open={addModalOpen}
        defaultDate={addModalDate}
        onClose={() => {
          setAddModalOpen(false);

          setAddModalDate(null);
        }}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
