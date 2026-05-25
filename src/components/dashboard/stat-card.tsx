import type { LucideIcon } from "lucide-react";

type Color = "blue" | "green" | "purple" | "orange" | "indigo" | "rose" | "teal";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?: Color;
  trend?: {
    value: number;
    direction: "up" | "down";
    label: string;
  };
}

const COLOR_MAP: Record<Color, { bg: string; iconBg: string; iconText: string; ring: string }> = {
  blue:   { bg: "bg-blue-50",   iconBg: "bg-blue-600",   iconText: "text-white", ring: "ring-blue-100"   },
  green:  { bg: "bg-green-50",  iconBg: "bg-green-600",  iconText: "text-white", ring: "ring-green-100"  },
  purple: { bg: "bg-purple-50", iconBg: "bg-purple-600", iconText: "text-white", ring: "ring-purple-100" },
  orange: { bg: "bg-orange-50", iconBg: "bg-orange-500", iconText: "text-white", ring: "ring-orange-100" },
  indigo: { bg: "bg-indigo-50", iconBg: "bg-indigo-600", iconText: "text-white", ring: "ring-indigo-100" },
  rose:   { bg: "bg-rose-50",   iconBg: "bg-rose-600",   iconText: "text-white", ring: "ring-rose-100"   },
  teal:   { bg: "bg-teal-50",   iconBg: "bg-teal-600",   iconText: "text-white", ring: "ring-teal-100"   },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "blue",
  trend,
}: StatCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">
            {value}
          </p>
        </div>
        {/* Icon badge */}
        <div className={`${c.bg} ${c.iconBg} ring-4 ${c.ring} p-2.5 rounded-xl shrink-0`}>
          <Icon className={`w-5 h-5 ${c.iconText}`} />
        </div>
      </div>

      {(description || trend) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                trend.direction === "up"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-xs text-gray-400">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}