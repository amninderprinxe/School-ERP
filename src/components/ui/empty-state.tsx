"use client";

import { motion } from "framer-motion";
import { cn }     from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import Link       from "next/link";

// ── SVG illustrations ─────────────────────────────────────────────

function EmptyDocsSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="20" y="12" width="60" height="72" rx="6" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" />
      <rect x="28" y="24" width="44" height="4" rx="2" fill="#C7D2FE" />
      <rect x="28" y="34" width="36" height="4" rx="2" fill="#C7D2FE" />
      <rect x="28" y="44" width="40" height="4" rx="2" fill="#C7D2FE" />
      <rect x="28" y="54" width="28" height="4" rx="2" fill="#E0E7FF" />
      <circle cx="85" cy="62" r="18" fill="#F0FDF4" stroke="#10B981" strokeWidth="1.5" />
      <path d="M78 62l5 5 9-9" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyStudentsSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <circle cx="60" cy="36" r="20" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <circle cx="60" cy="30" r="8" fill="#93C5FD" />
      <path d="M36 72c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="#EFF6FF" />
      <circle cx="88" cy="40" r="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
      <circle cx="88" cy="36" r="5" fill="#FCD34D" />
      <path d="M78 52c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#F59E0B" strokeWidth="1.2" fill="#FFFBEB" />
      <rect x="10" y="78" width="100" height="6" rx="3" fill="#E5E7EB" />
      <rect x="28" y="86" width="64" height="4" rx="2" fill="#F3F4F6" />
    </svg>
  );
}

function EmptySearchSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <circle cx="50" cy="46" r="26" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="50" cy="46" r="16" fill="#E5E7EB" />
      <path d="M71 67l14 14" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 42l4 4 8-8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyCalendarSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="20" y="20" width="80" height="64" rx="8" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1.5" />
      <rect x="20" y="20" width="80" height="22" rx="8" fill="#0EA5E9" />
      <rect x="20" y="34" width="80" height="8" fill="#0EA5E9" />
      <circle cx="40" cy="31" r="5" fill="white" fillOpacity="0.3" />
      <circle cx="80" cy="31" r="5" fill="white" fillOpacity="0.3" />
      <rect x="36" y="54" width="12" height="12" rx="3" fill="#BAE6FD" />
      <rect x="54" y="54" width="12" height="12" rx="3" fill="#E0F2FE" />
      <rect x="72" y="54" width="12" height="12" rx="3" fill="#E0F2FE" />
      <rect x="36" y="70" width="12" height="8" rx="2" fill="#E0F2FE" />
      <rect x="54" y="70" width="12" height="8" rx="2" fill="#E0F2FE" />
    </svg>
  );
}

function EmptyChartSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="16" y="72" width="16" height="12" rx="3" fill="#DDD6FE" />
      <rect x="38" y="56" width="16" height="28" rx="3" fill="#C4B5FD" />
      <rect x="60" y="44" width="16" height="40" rx="3" fill="#A78BFA" />
      <rect x="82" y="36" width="16" height="48" rx="3" fill="#8B5CF6" />
      <line x1="12" y1="84" x2="108" y2="84" stroke="#E5E7EB" strokeWidth="1.5" />
      <path d="M16 68 L38 52 L60 40 L82 32" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyInboxSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="16" y="24" width="88" height="56" rx="6" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="1.5" />
      <path d="M16 36l44 30 44-30" stroke="#D1D5DB" strokeWidth="1.5" />
      <circle cx="92" cy="28" r="10" fill="#10B981" />
      <path d="M86 28l4 4 6-8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyFeeSvg() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="16" y="20" width="88" height="56" rx="8" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="60" cy="48" r="18" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="60" y="53" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#D97706">₹</text>
      <rect x="28" y="76" width="24" height="4" rx="2" fill="#FDE68A" />
      <rect x="68" y="76" width="24" height="4" rx="2" fill="#FDE68A" />
    </svg>
  );
}

// ── SVG map ───────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  docs:     EmptyDocsSvg,
  students: EmptyStudentsSvg,
  search:   EmptySearchSvg,
  calendar: EmptyCalendarSvg,
  chart:    EmptyChartSvg,
  inbox:    EmptyInboxSvg,
  fee:      EmptyFeeSvg,
} as const;

export type EmptyIllustration = keyof typeof ILLUSTRATIONS;

// ─────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  illustration?: EmptyIllustration;
  title:         string;
  description?:  string;
  action?:       {
    label:  string;
    href?:  string;
    onClick?: () => void;
  };
  action2?: {
    label:  string;
    href?:  string;
    onClick?: () => void;
  };
  className?: string;
  size?:      "sm" | "md" | "lg";
}

export function EmptyState({
  illustration = "docs",
  title,
  description,
  action,
  action2,
  className,
  size = "md",
}: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[illustration];

  const svgSize = { sm: 72, md: 96, lg: 120 }[size];
  const py = { sm: "py-10", md: "py-14", lg: "py-20" }[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        py,
        "px-6",
        className,
      )}
    >
      {/* Floating illustration */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-5"
        style={{ transform: `scale(${svgSize / 120})` }}
      >
        <Illustration />
      </motion.div>

      {/* Text */}
      <h3 className={cn(
        "font-bold text-gray-900 dark:text-gray-100 leading-snug",
        size === "sm" ? "text-[14px]" : "text-[15px]",
      )}>
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || action2) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                  font-semibold text-white bg-blue-600 hover:bg-blue-700
                  rounded-xl transition-colors"
              >
                {action.label}
              </Link>
            ) : (
              <motion.button
                type="button"
                onClick={action.onClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                  font-semibold text-white bg-blue-600 hover:bg-blue-700
                  rounded-xl transition-colors"
              >
                {action.label}
              </motion.button>
            )
          )}
          {action2 && (
            action2.href ? (
              <Link
                href={action2.href}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                  font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700 hover:bg-gray-50
                  rounded-xl transition-colors"
              >
                {action2.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action2.onClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]
                  font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700 hover:bg-gray-50
                  rounded-xl transition-colors"
              >
                {action2.label}
              </button>
            )
          )}
        </div>
      )}
    </motion.div>
  );
}