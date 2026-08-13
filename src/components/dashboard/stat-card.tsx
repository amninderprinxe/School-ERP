import Link              from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn }            from "@/lib/utils";

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

const C: Record<Color, {
  bg:   string; icon:  string; val:  string;
  bgDk: string; iconDk: string; valDk: string;
}> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    val: "text-blue-700",    bgDk: "dark:bg-blue-950",    iconDk: "dark:text-blue-400",    valDk: "dark:text-blue-300"    },
  green:   { bg: "bg-green-50",   icon: "text-green-600",   val: "text-green-700",   bgDk: "dark:bg-green-950",   iconDk: "dark:text-green-400",   valDk: "dark:text-green-300"   },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   val: "text-amber-700",   bgDk: "dark:bg-amber-950",   iconDk: "dark:text-amber-400",   valDk: "dark:text-amber-300"   },
  red:     { bg: "bg-red-50",     icon: "text-red-600",     val: "text-red-700",     bgDk: "dark:bg-red-950",     iconDk: "dark:text-red-400",     valDk: "dark:text-red-300"     },
  purple:  { bg: "bg-purple-50",  icon: "text-purple-600",  val: "text-purple-700",  bgDk: "dark:bg-purple-950",  iconDk: "dark:text-purple-400",  valDk: "dark:text-purple-300"  },
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  val: "text-indigo-700",  bgDk: "dark:bg-indigo-950",  iconDk: "dark:text-indigo-400",  valDk: "dark:text-indigo-300"  },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", val: "text-emerald-700", bgDk: "dark:bg-emerald-950", iconDk: "dark:text-emerald-400", valDk: "dark:text-emerald-300" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    val: "text-rose-700",    bgDk: "dark:bg-rose-950",    iconDk: "dark:text-rose-400",    valDk: "dark:text-rose-300"    },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-500",    val: "text-gray-700",    bgDk: "dark:bg-gray-800",    iconDk: "dark:text-gray-400",    valDk: "dark:text-gray-200"    },
};

const BADGE_C = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  red:   "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-400",
  blue:  "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-400",
  gray:  "bg-gray-100  text-gray-600  dark:bg-gray-700     dark:text-gray-400",
};

export function StatCard({
  title, value, description, icon: Icon, href, color = "blue", badge,
}: Props) {
  const c = C[color];

  const inner = (
    <div className={cn(
      "bg-white dark:bg-gray-800/80",
      "rounded-xl border border-gray-100 dark:border-gray-700/60",
      "shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none",
      "p-5 flex items-start justify-between gap-4 h-full",
      href && "hover:shadow-md dark:hover:border-gray-600 hover:border-gray-200 transition-all duration-200",
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400
          uppercase tracking-wider leading-none">
          {title}
        </p>
        <p className={cn(
          "text-3xl font-black mt-2 leading-none tabular-nums",
          c.val, c.valDk,
        )}>
          {value}
        </p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2
            leading-snug line-clamp-2">
            {description}
          </p>
        )}
        {badge && (
          <span className={cn(
            "inline-flex mt-2 px-2 py-0.5 text-[10px] font-bold rounded-full",
            BADGE_C[badge.color],
          )}>
            {badge.label}
          </span>
        )}
      </div>
      <div className={cn(
        c.bg, c.bgDk,
        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
      )}>
        <Icon className={cn("w-5 h-5", c.icon, c.iconDk)} aria-hidden />
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full">{inner}</Link>;
  return inner;
}