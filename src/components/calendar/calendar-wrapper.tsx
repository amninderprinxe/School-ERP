'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const CalendarClient = dynamic(
  () =>
    import('@/components/calendar/calendar-client').then((m) => ({
      default: m.CalendarClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
      </div>
    ),
  }
);

type Props = {
  role: 'TEACHER' | 'SCHOOL_ADMIN';
  canCreate: boolean;
};

export function CalendarWrapper({ role, canCreate }: Props) {
  return <CalendarClient role={role} canCreate={canCreate} />;
}
