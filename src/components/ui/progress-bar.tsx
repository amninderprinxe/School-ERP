"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView }           from "framer-motion";
import { cn }                          from "@/lib/utils";

// ── Animated linear progress ──────────────────────────────────────

interface ProgressBarProps {
  value:       number;          // 0–100
  max?:        number;
  color?:      "blue" | "green" | "amber" | "red" | "purple" | "indigo";
  size?:       "xs" | "sm" | "md";
  label?:      string;
  showValue?:  boolean;
  animated?:   boolean;
  className?:  string;
  striped?:    boolean;
}

const COLOR_MAP = {
  blue:   "bg-blue-500",
  green:  "bg-emerald-500",
  amber:  "bg-amber-500",
  red:    "bg-red-500",
  purple: "bg-purple-500",
  indigo: "bg-indigo-500",
};

const SIZE_MAP = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2.5",
};

export function ProgressBar({
  value,
  max = 100,
  color = "blue",
  size = "md",
  label,
  showValue = false,
  animated = true,
  className,
  striped = false,
}: ProgressBarProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const pct    = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div ref={ref} className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-[12px] font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={cn(
        "w-full bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden",
        SIZE_MAP[size],
      )}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
          className={cn(
            "h-full rounded-full relative overflow-hidden",
            COLOR_MAP[color],
            striped && "bg-stripes",
          )}
        >
          {/* Shimmer on striped */}
          {animated && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent
                via-white/20 to-transparent"
              style={{
                animation: "shimmer 2s infinite",
                backgroundSize: "200% 100%",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Step progress indicator ───────────────────────────────────────

export function StepProgress({
  steps,
  current,
  className,
}: {
  steps:    string[];
  current:  number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0", className)} role="progressbar" aria-valuenow={current} aria-valuemax={steps.length}>
      {steps.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <motion.div
              animate={{
                backgroundColor: done ? "#10b981" : active ? "#2563eb" : "#e5e7eb",
                scale: active ? 1.1 : 1,
              }}
              transition={{ duration: 0.25 }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                "text-[12px] font-bold text-white shrink-0 z-10",
                pending && "text-gray-400",
              )}
            >
              {done ? (
                <motion.svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </motion.svg>
              ) : (
                <span className={pending ? "text-gray-400 dark:text-gray-600" : "text-white"}>
                  {i + 1}
                </span>
              )}
            </motion.div>

            {/* Label */}
            <div className="ml-2 shrink-0">
              <p className={cn(
                "text-[11px] font-semibold",
                active  ? "text-blue-600 dark:text-blue-400" :
                done    ? "text-emerald-600 dark:text-emerald-400" :
                "text-gray-400 dark:text-gray-600",
              )}>
                {step}
              </p>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 h-[2px] bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Top loading bar (like nprogress) ─────────────────────────────

export function TopProgressBar({ visible }: { visible: boolean }) {
  return (
    <AnimatePresenceWrapper>
      {visible && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.7 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 2, ease: [0.1, 0.4, 0.8, 1] }}
          className="fixed top-0 left-0 right-0 z-[99998] h-[3px] bg-blue-600
            rounded-full origin-left"
        />
      )}
    </AnimatePresenceWrapper>
  );
}

function AnimatePresenceWrapper({ children }: { children: React.ReactNode }) {
  const { AnimatePresence } = require("framer-motion");
  return <AnimatePresence>{children}</AnimatePresence>;
}