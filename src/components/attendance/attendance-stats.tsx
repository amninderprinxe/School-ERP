import { CalendarCheck, Clock, Percent, XCircle } from "lucide-react";

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  percentage: number;
}

interface Props {
  summary: AttendanceSummary;
}

export function AttendanceStats({ summary }: Props) {
  const stats = [
    {
      title: "Total Days",
      value: summary.total,
      icon: CalendarCheck,
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      title: "Present",
      value: summary.present,
      icon: CalendarCheck,
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      title: "Absent",
      value: summary.absent,
      icon: XCircle,
      bg: "bg-red-50",
      text: "text-red-600",
    },
    {
      title: "Late",
      value: summary.late,
      icon: Clock,
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      title: "Percentage",
      value: `${summary.percentage}%`,
      icon: Percent,
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {item.value}
                </p>
              </div>

              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.bg}`}
              >
                <Icon className={`w-5 h-5 ${item.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
