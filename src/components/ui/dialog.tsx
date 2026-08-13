"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal }            from "react-dom";
import { X }                       from "lucide-react";
import { SPRING, DURATION, EASE }  from "@/lib/motion";
import { cn }                      from "@/lib/utils";
import { useEffect }               from "react";

// ─────────────────────────────────────────────────────────────────
// Animated Dialog
// ─────────────────────────────────────────────────────────────────

interface DialogProps {
  open:        boolean;
  onClose:     () => void;
  title?:      string;
  description?: string;
  children:    React.ReactNode;
  size?:       "sm" | "md" | "lg" | "xl";
  className?:  string;
}

const SIZE_W = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function AnimatedDialog({
  open, onClose, title, description, children, size = "md", className,
}: DialogProps) {
  // Trap focus / lock scroll
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE.out }}
            className="fixed inset-0 z-50 bg-black/35 dark:bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "dialog-title" : undefined}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0,   scale: 0.95, y: 10  }}
              transition={SPRING.snappy}
              className={cn(
                "relative w-full bg-white dark:bg-gray-900",
                "rounded-2xl border border-gray-200 dark:border-gray-800",
                "shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
                "overflow-hidden",
                SIZE_W[size],
                className,
              )}
            >
              {/* Header */}
              {title && (
                <div className="flex items-start justify-between px-6 py-5
                  border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h2
                      id="dialog-title"
                      className="text-[16px] font-bold text-gray-900 dark:text-gray-100"
                    >
                      {title}
                    </h2>
                    {description && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700
                      dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800
                      transition-colors ml-4 -mr-1.5 -mt-1.5 shrink-0"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              )}

              {/* Content */}
              <div>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Confirm dialog ────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  loading = false,
}: {
  open:          boolean;
  onClose:       () => void;
  onConfirm:     () => void;
  title:         string;
  description?:  string;
  confirmLabel?: string;
  variant?:      "danger" | "warning" | "primary";
  loading?:      boolean;
}) {
  const btnCls = {
    danger:  "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
  }[variant];

  return (
    <AnimatedDialog open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-[13px] font-semibold text-gray-700 dark:text-gray-200
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.02 }}
          whileTap={loading ? {} : { scale: 0.97 }}
          className={cn(
            "px-4 py-2 text-[13px] font-bold rounded-xl transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
            btnCls,
          )}
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {confirmLabel}
        </motion.button>
      </div>
    </AnimatedDialog>
  );
}