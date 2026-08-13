"use client";

import React, { forwardRef } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import { fadeInUp, fadeIn, scaleIn, staggerChildren, listItem, DURATION, EASE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// FadeIn — generic fade-in wrapper
// ─────────────────────────────────────────────────────────────────

interface FadeInProps {
  children:   React.ReactNode;
  delay?:     number;
  duration?:  number;
  className?: string;
  as?:        keyof typeof motion;
}

export function FadeIn({ children, delay = 0, duration = DURATION.base, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, ease: EASE.out, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FadeInUp — fade and rise from below
// ─────────────────────────────────────────────────────────────────

export function FadeInUp({
  children,
  delay = 0,
  y = 12,
  className,
}: {
  children:   React.ReactNode;
  delay?:     number;
  y?:         number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DURATION.base, ease: EASE.spring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ScaleIn — scale from slightly smaller
// ─────────────────────────────────────────────────────────────────

export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children:   React.ReactNode;
  delay?:     number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...SPRING.snappy, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// StaggerList — animates children in sequence
// ─────────────────────────────────────────────────────────────────

export function StaggerList({
  children,
  className,
  delay = 0,
}: {
  children:   React.ReactNode;
  className?: string;
  delay?:     number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.055, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={listItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AnimatedCard — hover lift + shadow
// ─────────────────────────────────────────────────────────────────

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children:    React.ReactNode;
  liftAmount?: number;
  disabled?:   boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, liftAmount = 3, disabled = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref as any}
        whileHover={disabled ? {} : {
          y: -liftAmount,
          boxShadow: "0 12px 32px -4px rgba(0,0,0,0.10), 0 4px 8px -2px rgba(0,0,0,0.06)",
          transition: { type: "spring", stiffness: 400, damping: 22 },
        }}
        whileTap={disabled ? {} : { scale: 0.99 }}
        className={className}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  },
);

AnimatedCard.displayName = "AnimatedCard";

// ─────────────────────────────────────────────────────────────────
// AnimatedButton — press + hover
// ─────────────────────────────────────────────────────────────────

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children:  React.ReactNode;
  variant?:  "primary" | "secondary" | "ghost" | "danger";
  size?:     "sm" | "md" | "lg";
  loading?:  boolean;
  success?:  boolean;
  icon?:     React.ReactNode;
  iconRight?: React.ReactNode;
}

const BTN_VARIANTS = {
  primary:   "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]",
  secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
  ghost:     "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
  danger:    "bg-red-600 hover:bg-red-700 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]",
};

const BTN_SIZES = {
  sm: "px-3 py-1.5 text-[12px] gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-[13px] gap-2 rounded-xl",
  lg: "px-5 py-3 text-[14px] gap-2.5 rounded-xl",
};

export function AnimatedButton({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  success = false,
  disabled,
  icon,
  iconRight,
  ...props
}: AnimatedButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.01 }}
      whileTap={isDisabled  ? {} : { scale: 0.97 }}
      transition={SPRING.snappy}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center font-semibold",
        "transition-colors duration-150 outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className,
      )}
      {...(props as any)}
    >
      {/* Loading spinner */}
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1  }}
            exit={{ opacity: 0, scale: 0.6   }}
            transition={{ duration: DURATION.fast }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <LoadingSpinner size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
          </motion.span>
        ) : success ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1  }}
            exit={{ opacity: 0, scale: 0.6   }}
            transition={{ duration: DURATION.fast }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SuccessCheckMini />
          </motion.span>
        ) : null}
      </AnimatePresence>

      {/* Content */}
      <motion.span
        animate={{ opacity: loading || success ? 0 : 1 }}
        transition={{ duration: DURATION.fast }}
        className="flex items-center gap-[inherit]"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </motion.span>
    </motion.button>
  );
}

// ── Mini loading spinner ──────────────────────────────────────────

function LoadingSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Mini success check ────────────────────────────────────────────

function SuccessCheckMini() {
  return (
    <motion.svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      aria-hidden
    >
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE.out }}
      />
    </motion.svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// PageTransition — wraps page content
// ─────────────────────────────────────────────────────────────────

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DURATION.base, ease: EASE.spring }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Accordion — animated expand/collapse
// ─────────────────────────────────────────────────────────────────

export function Accordion({
  isOpen,
  children,
  className,
}: {
  isOpen:     boolean;
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.spring }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Drawer — slide from right or bottom
// ─────────────────────────────────────────────────────────────────

interface DrawerProps {
  open:       boolean;
  onClose:    () => void;
  children:   React.ReactNode;
  side?:      "right" | "bottom" | "left";
  width?:     number;
  title?:     string;
}

export function Drawer({
  open, onClose, children, side = "right", width = 480, title,
}: DrawerProps) {
  const variants = {
    right:  { hidden: { x: "100%"  }, visible: { x: 0   } },
    left:   { hidden: { x: "-100%" }, visible: { x: 0   } },
    bottom: { hidden: { y: "100%"  }, visible: { y: 0   } },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={variants[side].hidden}
            animate={variants[side].visible}
            exit={variants[side].hidden}
            transition={SPRING.soft}
            className={cn(
              "fixed z-50 bg-white dark:bg-gray-900",
              "border-l border-gray-200 dark:border-gray-800",
              "shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.5)]",
              "flex flex-col",
              side === "bottom"
                ? "left-0 right-0 bottom-0 rounded-t-2xl max-h-[85vh]"
                : side === "right"
                ? "top-0 right-0 bottom-0"
                : "top-0 left-0 bottom-0",
            )}
            style={side !== "bottom" ? { width } : undefined}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Dropdown — animated menu
// ─────────────────────────────────────────────────────────────────

export function DropdownMenu({
  open,
  children,
  className,
  align = "left",
}: {
  open:       boolean;
  children:   React.ReactNode;
  className?: string;
  align?:     "left" | "right";
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: DURATION.fast, ease: EASE.spring }}
          className={cn(
            "absolute z-50 mt-1.5",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-700",
            "rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "overflow-hidden min-w-[160px]",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  destructive = false,
  icon,
}: {
  children:    React.ReactNode;
  onClick?:    () => void;
  className?:  string;
  destructive?: boolean;
  icon?:       React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ backgroundColor: destructive ? "rgba(254,226,226,0.6)" : "rgba(249,250,251,0.9)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "w-full flex items-center gap-2.5 px-3.5 py-2.5",
        "text-[13px] font-medium text-left",
        "transition-colors outline-none",
        destructive
          ? "text-red-600 dark:text-red-400"
          : "text-gray-700 dark:text-gray-200",
        className,
      )}
    >
      {icon && <span className="w-4 h-4 shrink-0 opacity-70">{icon}</span>}
      {children}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────
// AnimatedTableRow
// ─────────────────────────────────────────────────────────────────

export function AnimatedTableRow({
  children,
  index = 0,
  className,
  onClick,
}: {
  children:   React.ReactNode;
  index?:     number;
  className?: string;
  onClick?:   () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION.base,
        delay:    Math.min(index * 0.035, 0.4),
        ease:     EASE.spring,
      }}
      whileHover={onClick ? { backgroundColor: "rgba(249,250,251,0.8)" } : {}}
      onClick={onClick}
      className={cn(onClick && "cursor-pointer", className)}
    >
      {children}
    </motion.tr>
  );
}