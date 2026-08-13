"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal }            from "react-dom";
import { DURATION, EASE }          from "@/lib/motion";
import { cn }                      from "@/lib/utils";

// ── Spinner variants ──────────────────────────────────────────────

function RingSpinner({ size = 40, color = "#3b82f6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden>
      <circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke={color}
        strokeOpacity={0.15}
        strokeWidth={4}
      />
      <motion.circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="80 45"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        style={{ originX: "25px", originY: "25px", transformBox: "fill-box" }}
      />
    </svg>
  );
}

// ── Inline spinner ────────────────────────────────────────────────

export function Spinner({
  size = 20,
  className,
}: {
  size?:      number;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <RingSpinner size={size} />
    </div>
  );
}

// ── Full page overlay ─────────────────────────────────────────────

export function LoadingOverlay({
  visible,
  label = "Loading…",
  blur = true,
}: {
  visible: boolean;
  label?:  string;
  blur?:   boolean;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE.out }}
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4",
            blur ? "bg-white/70 dark:bg-gray-950/70 backdrop-blur-[3px]" : "bg-white/90 dark:bg-gray-950/90",
          )}
          aria-label={label}
          aria-busy
        >
          <RingSpinner size={44} />
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[13px] font-semibold text-gray-600 dark:text-gray-400"
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Section loading overlay ───────────────────────────────────────

export function SectionOverlay({
  visible,
  label = "Updating…",
}: {
  visible: boolean;
  label?:  string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast }}
          className="absolute inset-0 z-20 flex items-center justify-center
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-[2px] rounded-2xl"
          aria-busy
        >
          <div className="flex flex-col items-center gap-2.5">
            <RingSpinner size={32} />
            <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">
              {label}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}