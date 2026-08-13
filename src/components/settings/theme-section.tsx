"use client";

import { useTheme }     from "next-themes";
import { useEffect, useState } from "react";
import { motion }       from "framer-motion";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn }           from "@/lib/utils";

const OPTIONS = [
  {
    value:  "light",
    label:  "Light",
    icon:   Sun,
    desc:   "Classic light interface",
    bg:     "bg-white border-gray-200",
    colors: ["bg-white", "bg-gray-100", "bg-blue-600", "bg-gray-800"],
  },
  {
    value:  "dark",
    label:  "Dark",
    icon:   Moon,
    desc:   "Easy on the eyes",
    bg:     "bg-gray-900 border-gray-700",
    colors: ["bg-gray-900", "bg-gray-800", "bg-blue-500", "bg-gray-100"],
  },
  {
    value:  "system",
    label:  "System",
    icon:   Monitor,
    desc:   "Matches your OS setting",
    bg:     "bg-gradient-to-br from-white to-gray-900 border-gray-400",
    colors: ["bg-gray-400", "bg-gray-500", "bg-blue-500", "bg-gray-300"],
  },
] as const;

export function ThemeSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted]              = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const Icon     = opt.icon;
          const isActive = theme === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={isActive}
              className={cn(
                "relative flex flex-col items-center gap-2.5 p-4 rounded-2xl",
                "border-2 transition-all duration-200 group text-center",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isActive
                  ? "border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              {/* Active check */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2.5 right-2.5 w-5 h-5 bg-blue-600
                    rounded-full flex items-center justify-center shadow-sm"
                >
                  <Check className="w-3 h-3 text-white" aria-hidden />
                </motion.div>
              )}

              {/* Mini preview */}
              <div className={cn(
                "w-full h-10 rounded-xl border overflow-hidden",
                opt.bg,
              )}>
                <div className="flex h-full">
                  <div className={cn("w-1/3 h-full", opt.colors[0])} />
                  <div className="flex-1 flex flex-col justify-around p-1 gap-0.5">
                    <div className={cn("h-1.5 rounded-full w-2/3", opt.colors[1])} />
                    <div className={cn("h-1.5 rounded-full w-1/2", opt.colors[2])} />
                    <div className={cn("h-1.5 rounded-full w-3/4", opt.colors[3])} />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500",
                    )}
                    aria-hidden
                  />
                  <p className={cn(
                    "text-[13px] font-bold",
                    isActive
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-gray-900 dark:text-gray-100",
                  )}>
                    {opt.label}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status line */}
      <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
        Currently using{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
          {resolvedTheme}
        </span>
        {" "}mode
        {theme === "system" && (
          <span className="text-gray-400 dark:text-gray-600"> (system preference)</span>
        )}
      </p>
    </div>
  );
}