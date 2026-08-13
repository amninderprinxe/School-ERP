"use client";

import { useState }          from "react";
import { motion }            from "framer-motion";
import {
  Shield, AlertTriangle, Download,
  RefreshCw, Info, ExternalLink,
}                            from "lucide-react";
import { cn }                from "@/lib/utils";
import { SettingsSection }   from "./settings-ui";
import type { SchoolSettingsData } from "@/lib/validations/school-settings";

// ── Action card ───────────────────────────────────────────────────

function ActionCard({
  title,
  description,
  buttonLabel,
  onClick,
  variant = "default",
  icon: Icon,
}: {
  title:       string;
  description: string;
  buttonLabel: string;
  onClick:     () => void;
  variant?:    "default" | "warning" | "danger";
  icon:        React.ComponentType<{ className?: string }>;
}) {
  const styles = {
    default: {
      border:  "border-gray-200 dark:border-gray-700",
      bg:      "bg-gray-50 dark:bg-gray-700/40",
      btn:     "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600",
      iconBg:  "bg-gray-100 dark:bg-gray-700",
      iconCls: "text-gray-600 dark:text-gray-400",
    },
    warning: {
      border:  "border-amber-200 dark:border-amber-800/60",
      bg:      "bg-amber-50 dark:bg-amber-950/20",
      btn:     "bg-amber-600 border-amber-600 text-white hover:bg-amber-700",
      iconBg:  "bg-amber-100 dark:bg-amber-900/40",
      iconCls: "text-amber-600 dark:text-amber-400",
    },
    danger: {
      border:  "border-red-200 dark:border-red-800/60",
      bg:      "bg-red-50 dark:bg-red-950/20",
      btn:     "bg-red-600 border-red-600 text-white hover:bg-red-700",
      iconBg:  "bg-red-100 dark:bg-red-900/40",
      iconCls: "text-red-600 dark:text-red-400",
    },
  }[variant];

  return (
    <div className={cn(
      "flex items-start justify-between gap-4 p-4 rounded-xl border",
      styles.border, styles.bg,
    )}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", styles.iconBg)}>
          <Icon className={cn("w-4 h-4", styles.iconCls)} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 leading-snug">
            {title}
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "shrink-0 px-4 py-2 text-[12px] font-bold rounded-xl",
          "border transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-blue-500",
          styles.btn,
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

export function DangerSection({ school }: { school: SchoolSettingsData }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText,      setConfirmText]       = useState("");

  const handleExport = () => {
    // In production: trigger a full data export job
    alert("Data export initiated. You will receive an email with a download link shortly.");
  };

  const handleResetTimetable = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    if (confirmText === school.name) {
      // In production: call a reset action
      alert("Timetable reset initiated.");
      setShowResetConfirm(false);
      setConfirmText("");
    }
  };

  return (
    <SettingsSection
      id="danger"
      title="Advanced Settings"
      description="Data management and irreversible operations"
      icon={Shield}
      accent="red"
    >
      <div className="space-y-5">

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 dark:bg-blue-950/30
          border border-blue-200 dark:border-blue-800 rounded-xl">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12px] font-medium text-blue-800 dark:text-blue-400">
            Actions in this section may be irreversible. Proceed with caution
            and ensure you have a backup before making changes.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <ActionCard
            title="Export School Data"
            description="Download a complete CSV/JSON export of all school data including students, attendance, fees and results"
            buttonLabel="Export Data"
            onClick={handleExport}
            icon={Download}
            variant="default"
          />

          <ActionCard
            title="Reset Timetable"
            description="Delete all period entries for the current academic year. Student and teacher profiles are not affected."
            buttonLabel="Reset Timetable"
            onClick={handleResetTimetable}
            icon={RefreshCw}
            variant="warning"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-700/60" />

        {/* School info footer */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
          {[
            { label: "School ID",   value: school.id,     mono: true  },
            { label: "Status",      value: school.status, mono: false },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3
                border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
            >
              <p className="text-[12px] font-semibold text-gray-400 dark:text-gray-500">
                {row.label}
              </p>
              <p className={cn(
                "text-[12px] text-gray-800 dark:text-gray-200",
                row.mono ? "font-mono" : "font-semibold",
              )}>
                {row.value}
              </p>
            </div>
          ))}
        </div>

        {/* Timetable reset confirm modal */}
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300
              dark:border-amber-700 rounded-2xl space-y-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
              <p className="text-[13px] font-bold text-amber-900 dark:text-amber-400">
                Confirm Timetable Reset
              </p>
            </div>
            <p className="text-[12px] text-amber-800 dark:text-amber-500">
              This will permanently delete all period entries. Type{" "}
              <strong className="font-mono">{school.name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={school.name}
              className="w-full border border-amber-300 dark:border-amber-700
                bg-white dark:bg-gray-800 rounded-xl px-3.5 py-2.5 text-[13px]
                font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowResetConfirm(false); setConfirmText(""); }}
                className="flex-1 py-2 text-[13px] font-semibold text-gray-600
                  bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                  rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText !== school.name}
                onClick={handleConfirmReset}
                className="flex-1 py-2 text-[13px] font-bold text-white bg-amber-600
                  hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed
                  rounded-xl transition-colors"
              >
                Reset Timetable
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </SettingsSection>
  );
}