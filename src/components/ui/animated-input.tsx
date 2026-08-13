"use client";

import {
  forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes,
}                              from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn }                  from "@/lib/utils";
import { DURATION }            from "@/lib/motion";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// ── Animated input ────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  icon?:     React.ReactNode;
  iconRight?: React.ReactNode;
}

export const AnimatedInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, type, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const hasError  = !!error;
    const inputType = type === "password" ? (showPass ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider
            text-gray-500 dark:text-gray-400">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2
              text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}

          <motion.input
            ref={ref}
            type={inputType}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            animate={{
              boxShadow: focused
                ? hasError
                  ? "0 0 0 3px rgba(239,68,68,0.15)"
                  : "0 0 0 3px rgba(37,99,235,0.15)"
                : "0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: DURATION.fast }}
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-[13px]",
              "text-gray-900 dark:text-gray-100",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "bg-white dark:bg-gray-700/50",
              "transition-colors duration-150 outline-none",
              hasError
                ? "border-red-300 dark:border-red-700"
                : focused
                ? "border-blue-400 dark:border-blue-600"
                : "border-gray-200 dark:border-gray-700",
              icon     && "pl-10",
              (iconRight || type === "password") && "pr-10",
              className,
            )}
            {...(props as any)}
          />

          {/* Password toggle */}
          {type === "password" && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass((p) => !p)}
              aria-label={showPass ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPass
                ? <EyeOff className="w-4 h-4" aria-hidden />
                : <Eye    className="w-4 h-4" aria-hidden />}
            </button>
          )}

          {/* Right icon (non-password) */}
          {iconRight && type !== "password" && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>

        {/* Error / hint */}
        <AnimatePresence mode="wait">
          {hasError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.fast }}
              className="flex items-center gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-gray-400 dark:text-gray-500"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedInput.displayName = "AnimatedInput";

// ── Animated select ───────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
}

export const AnimatedSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, children, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const hasError = !!error;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider
            text-gray-500 dark:text-gray-400">
            {label}
          </label>
        )}
        <div className="relative">
          <motion.select
            ref={ref}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            animate={{
              boxShadow: focused
                ? "0 0 0 3px rgba(37,99,235,0.15)"
                : "0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: DURATION.fast }}
            className={cn(
              "w-full appearance-none rounded-xl border px-3.5 py-2.5",
              "text-[13px] text-gray-900 dark:text-gray-100",
              "bg-white dark:bg-gray-700/50",
              "outline-none transition-colors duration-150 pr-10",
              hasError
                ? "border-red-300 dark:border-red-700"
                : focused
                ? "border-blue-400 dark:border-blue-600"
                : "border-gray-200 dark:border-gray-700",
              className,
            )}
            {...(props as any)}
          >
            {children}
          </motion.select>
          <svg
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4
              text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2}
            viewBox="0 0 24 24" aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" />
          </svg>
        </div>
        {(error || hint) && (
          <p className={cn(
            "text-[12px]",
            error ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-400 dark:text-gray-500",
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

AnimatedSelect.displayName = "AnimatedSelect";

// ── Animated textarea ─────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export const AnimatedTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider
            text-gray-500 dark:text-gray-400">
            {label}
          </label>
        )}
        <motion.textarea
          ref={ref}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          animate={{
            boxShadow: focused
              ? "0 0 0 3px rgba(37,99,235,0.15)"
              : "0 0 0 0px rgba(0,0,0,0)",
          }}
          transition={{ duration: DURATION.fast }}
          className={cn(
            "w-full rounded-xl border px-3.5 py-2.5 text-[13px]",
            "text-gray-900 dark:text-gray-100",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "bg-white dark:bg-gray-700/50",
            "transition-colors duration-150 outline-none resize-none",
            error
              ? "border-red-300 dark:border-red-700"
              : focused
              ? "border-blue-400 dark:border-blue-600"
              : "border-gray-200 dark:border-gray-700",
            className,
          )}
          {...(props as any)}
        />
        {(error || hint) && (
          <p className={cn(
            "text-[12px]",
            error ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500",
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

AnimatedTextarea.displayName = "AnimatedTextarea";