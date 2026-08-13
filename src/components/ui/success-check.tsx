"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn }                      from "@/lib/utils";
import { SPRING }                  from "@/lib/motion";

// ─────────────────────────────────────────────────────────────────
// Animated Success Checkmark
// ─────────────────────────────────────────────────────────────────

export function SuccessCheck({
  visible,
  size = 64,
  className,
}: {
  visible:    boolean;
  size?:      number;
  className?: string;
}) {
  const r = size * 0.46;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={SPRING.bouncy}
          className={cn("flex items-center justify-center", className)}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label="Success">
            {/* Circle */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={r}
              stroke="#10b981"
              strokeWidth={size * 0.055}
              fill="#ecfdf5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />

            {/* Check path */}
            <motion.path
              d={`M ${cx - r * 0.38} ${cy} l ${r * 0.32} ${r * 0.34} l ${r * 0.62} ${-r * 0.56}`}
              stroke="#10b981"
              strokeWidth={size * 0.07}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Animated Error X
// ─────────────────────────────────────────────────────────────────

export function ErrorX({
  visible,
  size = 64,
  className,
}: {
  visible:    boolean;
  size?:      number;
  className?: string;
}) {
  const r  = size * 0.46;
  const cx = size / 2;
  const cy = size / 2;
  const d  = r * 0.32;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={SPRING.bouncy}
          className={cn("flex items-center justify-center", className)}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label="Error">
            <motion.circle
              cx={cx} cy={cy} r={r}
              stroke="#ef4444"
              strokeWidth={size * 0.055}
              fill="#fef2f2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              d={`M ${cx - d} ${cy - d} L ${cx + d} ${cy + d} M ${cx + d} ${cy - d} L ${cx - d} ${cy + d}`}
              stroke="#ef4444"
              strokeWidth={size * 0.07}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Success Banner — inline in forms
// ─────────────────────────────────────────────────────────────────

export function SuccessBanner({
  visible,
  title = "Saved successfully!",
  body,
  className,
}: {
  visible:    boolean;
  title?:     string;
  body?:      string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className={cn("overflow-hidden", className)}
        >
          <div className="flex items-start gap-3 px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/30
            border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
            <SuccessCheck visible size={24} />
            <div>
              <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-400">
                {title}
              </p>
              {body && (
                <p className="text-[12px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                  {body}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Error Banner — inline in forms
// ─────────────────────────────────────────────────────────────────

export function ErrorBanner({
  visible,
  title = "Something went wrong",
  body,
  className,
}: {
  visible:    boolean;
  title?:     string;
  body?:      string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className={cn("overflow-hidden", className)}
        >
          <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 dark:bg-red-950/30
            border border-red-200 dark:border-red-800/60 rounded-xl">
            <ErrorX visible size={24} />
            <div>
              <p className="text-[13px] font-bold text-red-800 dark:text-red-400">
                {title}
              </p>
              {body && (
                <p className="text-[12px] text-red-600 dark:text-red-500 mt-0.5">
                  {body}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}