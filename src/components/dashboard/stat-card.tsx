import Link              from "next/link";
import type { LucideIcon } from "lucide-react";

type Color =
  | "blue" | "green" | "amber" | "red"
  | "purple" | "indigo" | "emerald" | "rose" | "gray";

interface Props {
  title:        string;
  value:        string | number;
  description?: string;
  icon:         LucideIcon;
  href?:        string;
  color?:       Color;
  badge?:       { label: string; color: "green" | "amber" | "red" | "blue" | "gray" };
}

const C: Record<Color, { bg: string; icon: string; val: string }> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    val: "text-blue-700"    },
  green:   { bg: "bg-green-50",   icon: "text-green-600",   val: "text-green-700"   },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   val: "text-amber-700"   },
  red:     { bg: "bg-red-50",     icon: "text-red-600",     val: "text-red-700"     },
  purple:  { bg: "bg-purple-50",  icon: "text-purple-600",  val: "text-purple-700"  },
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  val: "text-indigo-700"  },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", val: "text-emerald-700" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    val: "text-rose-700"    },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-500",    val: "text-gray-700"    },
};

const BADGE_C = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red:   "bg-red-100   text-red-700",
  blue:  "bg-blue-100  text-blue-700",
  gray:  "bg-gray-100  text-gray-600",
};

export function StatCard({
  title, value, description, icon: Icon, href, color = "blue", badge,
}: Props) {
  const c = C[color];

  const inner = (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5
        flex items-start justify-between gap-4 h-full
        ${href ? "hover:shadow-md hover:border-gray-200 transition-all duration-200" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-none">
          {title}
        </p>
        <p className={`text-3xl font-black mt-2 leading-none ${c.val}`}>
          {value}
        </p>
        {description && (
          <p className="text-xs text-gray-400 mt-2 leading-snug line-clamp-2">
            {description}
          </p>
        )}
        {badge && (
          <span
            className={`inline-flex mt-2 px-2 py-0.5 text-[10px] font-bold
              rounded-full ${BADGE_C[badge.color]}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className={`${c.bg} w-11 h-11 rounded-xl flex items-center
        justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full">{inner}</Link>;
  return inner;
}
