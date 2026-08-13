"use client";

import { useEffect, useRef, useState as useStateHook } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal }            from "react-dom";
import {
  CheckCircle2, XCircle, AlertTriangle,
  Info, X, Loader2, ArrowRight,
}                                  from "lucide-react";
import { cn }                      from "@/lib/utils";
import { useToastState, toastStore } from "@/hooks/use-toast";
import type { ToastItem, ToastVariant } from "@/hooks/use-toast";
import { SPRING, DURATION }          from "@/lib/motion";

// ── Toast config ──────────────────────────────────────────────────

const VARIANT_CFG: Record<ToastVariant, {
  icon:     React.ComponentType<{ className?: string }>;
  iconCls:  string;
  bg:       string;
  border:   string;
  bar:      string;
}> = {
  success: {
    icon:    CheckCircle2,
    iconCls: "text-emerald-500",
    bg:      "bg-white dark:bg-gray-900",
    border:  "border-emerald-200 dark:border-emerald-800/60",
    bar:     "bg-emerald-500",
  },
  error: {
    icon:    XCircle,
    iconCls: "text-red-500",
    bg:      "bg-white dark:bg-gray-900",
    border:  "border-red-200 dark:border-red-800/60",
    bar:     "bg-red-500",
  },
  warning: {
    icon:    AlertTriangle,
    iconCls: "text-amber-500",
    bg:      "bg-white dark:bg-gray-900",
    border:  "border-amber-200 dark:border-amber-800/60",
    bar:     "bg-amber-500",
  },
  info: {
    icon:    Info,
    iconCls: "text-blue-500",
    bg:      "bg-white dark:bg-gray-900",
    border:  "border-blue-200 dark:border-blue-800/60",
    bar:     "bg-blue-500",
  },
  loading: {
    icon:    Loader2,
    iconCls: "text-gray-500 animate-spin",
    bg:      "bg-white dark:bg-gray-900",
    border:  "border-gray-200 dark:border-gray-700",
    bar:     "bg-gray-300",
  },
};

// ── Progress bar ──────────────────────────────────────────────────

function ToastProgress({
  duration,
  variant,
}: {
  duration: number;
  variant:  ToastVariant;
}) {
  if (!duration) return null;
  const cfg = VARIANT_CFG[variant];
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-100 dark:bg-gray-800">
      <motion.div
        initial={{ scaleX: 1, originX: 0 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={cn("h-full rounded-full", cfg.bar)}
      />
    </div>
  );
}

// ── Single toast ──────────────────────────────────────────────────

function ToastCard({ item }: { item: ToastItem }) {
  const cfg  = VARIANT_CFG[item.variant];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.94 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{
        opacity: 0,
        x: 60,
        scale: 0.94,
        transition: { duration: DURATION.fast },
      }}
      transition={SPRING.snappy}
      className={cn(
        "relative flex items-start gap-3 px-4 py-3.5 rounded-2xl",
        "border shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        "max-w-[380px] w-full overflow-hidden",
        cfg.bg, cfg.border,
      )}
      role="alert"
      aria-live={item.variant === "error" ? "assertive" : "polite"}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("w-4.5 h-4.5", cfg.iconCls)} aria-hidden />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">
          {item.title}
        </p>
        {item.body && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            {item.body}
          </p>
        )}
        {item.action && (
          <button
            type="button"
            onClick={() => { item.action!.onClick(); toastStore.remove(item.id); }}
            className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold
              text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.action.label}
            <ArrowRight className="w-3 h-3" aria-hidden />
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => { item.onDismiss?.(); toastStore.remove(item.id); }}
        aria-label="Dismiss notification"
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-700
          dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors -mr-1 -mt-0.5"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>

      {/* Progress bar */}
      {item.duration && item.duration > 0 && (
        <ToastProgress duration={item.duration} variant={item.variant} />
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TOAST CONTAINER — mounted once in providers
// ─────────────────────────────────────────────────────────────────
export function ToastContainer() {
  const items = useToastState();
  const [mounted, setMounted] = useStateHook(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[99999] flex flex-col-reverse gap-2.5
        pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// function useState(arg0: boolean): [any, any] {
//   throw new Error("Function not implemented.");
// }
