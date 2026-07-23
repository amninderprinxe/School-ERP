import { CalendarCheck } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

export interface AttendanceRecord {
  id: string;
  date: Date;
  status: AttendanceStatus;
  remarks: string | null;
}

interface Props {
  records: AttendanceRecord[];
  emptyText?: string;
}

type StatusConfig = {
  label: string;
  pill: string;
  row: string;
};

const STATUS_CFG: Record<AttendanceStatus, StatusConfig> = {
  PRESENT: {
    label: "Present",
    pill: "bg-green-50 text-green-700",
    row: "",
  },
  ABSENT: {
    label: "Absent",
    pill: "bg-red-50 text-red-600",
    row: "bg-red-50/30",
  },
  LATE: {
    label: "Late",
    pill: "bg-amber-50 text-amber-700",
    row: "bg-amber-50/30",
  },
  HALF_DAY: {
    label: "Half Day",
    pill: "bg-blue-50 text-blue-700",
    row: "bg-blue-50/30",
  },
};

// Always display in IST to avoid timezone edge cases
function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatDay(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function AttendanceTable({ records, emptyText }: Props) {
  if (records.length === 0) {
    return (
      <div className="py-14 text-center">
        <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No records found</p>
        <p className="text-xs text-gray-400 mt-1">
          {emptyText ?? "No attendance has been marked for this period."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {["#", "Date", "Day", "Status", "Remarks"].map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left first:w-10"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {records.map((r, i) => {
            const cfg = STATUS_CFG[r.status];

            return (
              <tr
                key={r.id}
                className={`transition-colors hover:brightness-95 ${cfg.row}`}
              >
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {i + 1}
                </td>

                <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                  {formatDate(r.date)}
                </td>

                <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                  {formatDay(r.date)}
                </td>

                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}
                  >
                    {cfg.label}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate">
                  {r.remarks ?? <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
