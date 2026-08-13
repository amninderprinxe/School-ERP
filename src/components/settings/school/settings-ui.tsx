"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Save, CheckCircle2, AlertCircle, Loader2,
}                                  from "lucide-react";
import { cn }                      from "@/lib/utils";
import type { ActionResult }       from "@/action/school-settings.actions";
import type { LucideIcon }         from "lucide-react";

// ── Shared class strings ──────────────────────────────────────────

export const inputCls = cn(
  "w-full border border-gray-200 dark:border-gray-700",
  "bg-white dark:bg-gray-700/50 rounded-xl px-3.5 py-2.5",
  "text-[13px] text-gray-900 dark:text-gray-100",
  "placeholder-gray-400 dark:placeholder-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  "transition-colors duration-150",
);

export const labelCls = cn(
  "block text-[11px] font-bold uppercase tracking-wider mb-1.5",
  "text-gray-500 dark:text-gray-400",
);

// ── Section wrapper ───────────────────────────────────────────────

export function SettingsSection({
  id, title, description, icon: Icon, accent = "blue", children,
}: {
  id:          string;
  title:       string;
  description: string;
  icon:        LucideIcon;
  accent?:     "blue" | "purple" | "emerald" | "amber" | "red";
  children:    React.ReactNode;
}) {
  const accentCfg = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-950/40",    icon: "text-blue-600 dark:text-blue-400"    },
    purple:  { bg: "bg-purple-50 dark:bg-purple-950/40",icon: "text-purple-600 dark:text-purple-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40",icon: "text-emerald-600 dark:text-emerald-400" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-950/40",  icon: "text-amber-600 dark:text-amber-400"   },
    red:     { bg: "bg-red-50 dark:bg-red-950/40",      icon: "text-red-600 dark:text-red-400"       },
  }[accent];

  return (
    <section
      id={id}
      className="scroll-mt-6 bg-white dark:bg-gray-800/80 rounded-2xl
        border border-gray-100 dark:border-gray-700/60
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden"
    >
      {/* Section header */}
      <div className="flex items-start gap-3 px-6 py-5
        border-b border-gray-100 dark:border-gray-700/60">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          accentCfg.bg,
        )}>
          <Icon className={cn("w-[18px] h-[18px]", accentCfg.icon)} aria-hidden />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Section content */}
      <div className="p-6">{children}</div>
    </section>
  );
}

// ── Save button with feedback ─────────────────────────────────────

export function SaveButton({
  isPending,
  result,
  label = "Save Changes",
}: {
  isPending: boolean;
  result:    ActionResult | null;
  label?:    string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-5
      border-t border-gray-100 dark:border-gray-700/60 mt-5">
      {/* Feedback message */}
      <AnimatePresence mode="wait">
        {result?.success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{ opacity: 0, x: -8    }}
            transition={{ duration: 0.2  }}
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400
              text-[13px] font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden />
            Saved successfully
          </motion.div>
        )}
        {result?.error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{ opacity: 0, x: -8    }}
            transition={{ duration: 0.2  }}
            className="flex items-center gap-2 text-red-600 dark:text-red-400
              text-[13px] font-semibold"
          >
            <AlertCircle className="w-4 h-4" aria-hidden />
            {result.error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isPending}
        className="ml-auto inline-flex items-center gap-2 px-5 py-2.5
          text-[13px] font-semibold text-white bg-blue-600
          hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
          rounded-xl transition-colors focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Save className="w-4 h-4" aria-hidden />
        )}
        {isPending ? "Saving…" : label}
      </button>
    </div>
  );
}

// ── Animated toggle ───────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked:      boolean;
  onChange:     (v: boolean) => void;
  label:        string;
  description?: string;
  disabled?:    boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3.5",
        "border-b border-gray-50 dark:border-gray-700/50 last:border-b-0",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full",
          "transition-colors duration-200 shrink-0 mt-0.5",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
          checked
            ? "bg-blue-600"
            : "bg-gray-200 dark:bg-gray-700",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="inline-block w-5 h-5 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

// ── Field group ───────────────────────────────────────────────────

export function Field({
  label, hint, required, children,
}: {
  label:     string;
  hint?:     string;
  required?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Grid layout ───────────────────────────────────────────────────

export function FieldGrid({
  cols = 2,
  children,
}: {
  cols?:    2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "grid gap-4",
      cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
    )}>
      {children}
    </div>
  );
}