"use client";

import { useEffect, useState } from "react";
import { useTheme }            from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { cn }                  from "@/lib/utils";
import { createPortal }        from "react-dom";
import { useRef }              from "react";

// ─────────────────────────────────────────────────────────────────
// ICON TOGGLE  — compact button for topbar
// ─────────────────────────────────────────────────────────────────

export function ThemeToggleIcon() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted]       = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9 rounded-xl" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative p-2 rounded-xl transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isDark
          ? "text-amber-400 hover:text-amber-300 hover:bg-gray-800"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1   }}
            exit={   { rotate:  90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="block"
            aria-hidden
          >
            <Sun className="w-[18px] h-[18px]" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate:  90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1   }}
            exit={   { rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="block"
            aria-hidden
          >
            <Moon className="w-[18px] h-[18px]" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// FULL PICKER  — 3-option segmented control (Light / Dark / System)
// ─────────────────────────────────────────────────────────────────

export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-10 w-60 rounded-xl bg-gray-100 animate-pulse" />;

  const OPTIONS = [
    { value: "light",  label: "Light",  icon: Sun     },
    { value: "dark",   label: "Dark",   icon: Moon    },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "flex items-center bg-gray-100 dark:bg-gray-800",
        "rounded-xl p-1 gap-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon     = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 py-2",
              "text-[13px] font-semibold rounded-lg transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="theme-picker-active"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANIMATED SWITCH  — pill toggle for compact spaces
// ─────────────────────────────────────────────────────────────────

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted]       = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-14 h-7 rounded-full bg-gray-200" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-7 w-14 items-center rounded-full",
        "transition-colors duration-300 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
        isDark ? "bg-blue-600" : "bg-gray-200",
      )}
    >
      {/* Track icons */}
      <span className="absolute left-1.5 text-yellow-400 opacity-100">
        <Sun className="w-3.5 h-3.5" aria-hidden />
      </span>
      <span className="absolute right-1.5 text-blue-200 opacity-100">
        <Moon className="w-3 h-3" aria-hidden />
      </span>

      {/* Thumb */}
      <motion.span
        layout
        className={cn(
          "relative z-10 flex items-center justify-center",
          "h-5 w-5 rounded-full bg-white shadow-md",
        )}
        animate={{ x: isDark ? 28 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon-thumb"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0   }}
              exit={   { scale: 0, rotate:  90 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-3 h-3 text-blue-600" aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="sun-thumb"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0  }}
              exit={   { scale: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-3 h-3 text-amber-500" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}