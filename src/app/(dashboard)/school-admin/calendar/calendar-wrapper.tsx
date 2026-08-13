"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const CalendarClient = dynamic(
  () =>
    import("@/components/calendar/calendar-client").then(
      (m) => m.CalendarClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Loading calendar…
        </p>
      </div>
    ),
  }
);

type AnyProps = Record<string, any>;

export function CalendarWrapper(props: AnyProps) {
  return <CalendarClient {...(props as any)} />;
}