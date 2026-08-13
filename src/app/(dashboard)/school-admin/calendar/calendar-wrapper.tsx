"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";

interface CalendarWrapperProps {
  role: string;
  canCreate: boolean;
}

const CalendarClient = dynamic(
  () =>
    import("@/components/calendar/calendar-client").then(
      (mod) => mod.CalendarClient as unknown as ComponentType<CalendarWrapperProps>
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">
          Loading Calendar...
        </p>
      </div>
    ),
  }
);

export function CalendarWrapper({ role, canCreate }: CalendarWrapperProps) {
  return <CalendarClient role={role} canCreate={canCreate} />;
}