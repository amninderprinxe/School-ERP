"use client";

import Link                  from "next/link";
import { motion }            from "framer-motion";
import {
  Edit, KeyRound, FileDown, Phone, Mail,
  MapPin, Calendar, Droplets, CheckCircle2,
  XCircle, ChevronLeft, ExternalLink,
  type LucideIcon,
}                            from "lucide-react";
import { cn }               from "@/lib/utils";
import type { StudentProfileData } from "./types";

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function calcAge(iso: string | null): string {
  if (!iso) return "—";
  const dob  = new Date(iso);
  const now  = new Date();
  const age  = now.getFullYear() - dob.getFullYear() -
    (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return `${age} yrs`;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

// ── Stat pill ─────────────────────────────────────────────────────

function QuickStat({
  icon: Icon, label, value, color,
}: {
  icon:  LucideIcon;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm
      rounded-xl px-4 py-2.5 border border-white/60 shadow-sm">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-3.5 h-3.5" aria-hidden />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none">
          {label}
        </p>
        <p className="text-[13px] font-bold text-gray-900 mt-0.5 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN HEADER
// ─────────────────────────────────────────────────────────────────

interface Props {
  data:        StudentProfileData;
  onTabChange: (tab: string) => void;
}

export function ProfileHeader({ data, onTabChange }: Props) {
  const { user, profile, section, attendance, results, feePayments } = data;

  // ── Derived stats ─────────────────────────────────────────────
  const attTotal   = attendance.length;
  const attPresent = attendance.filter((a) => a.status === "PRESENT").length;
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const overallAvg = results.length > 0
    ? Math.round(results.reduce((s, r) =>
        s + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0
      ) / results.length)
    : null;

  const totalFee    = feePayments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid   = feePayments.reduce((s, p) => s + p.amountPaid, 0);
  const feesPct     = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 100;

  // ── Badge helpers ─────────────────────────────────────────────
  const genderLabel  = user.gender
    ? user.gender.charAt(0) + user.gender.slice(1).toLowerCase()
    : null;

  const EXAM_TYPE_LABELS: Record<string, string> = {
    UNIT_TEST: "Unit Test", MID_TERM: "Mid Term", FINAL: "Final",
    ASSIGNMENT: "Assignment", PRACTICAL: "Practical", OTHER: "Other",
  };

  const lastExam = results[0];

  return (
    <div className="mb-0">

      {/* ── Gradient banner ─────────────────────────────── */}
      <div
        className="relative h-36 sm:h-44 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #6366f1 50%, #8b5cf6 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full
          bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full
          bg-white/5 pointer-events-none" />
        <div className="absolute top-8 right-1/4 w-24 h-24 rounded-full
          bg-white/5 pointer-events-none" />

        {/* Back link + actions (inside banner) */}
        <div className="absolute top-4 left-4 sm:left-6 lg:left-8 flex items-center gap-3">
          <Link
            href="/school-admin/students"
            className="flex items-center gap-1.5 text-white/80 hover:text-white
              text-[13px] font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-white/50 rounded-lg px-1"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Students
          </Link>
        </div>

        {/* Quick actions in banner top-right */}
        <div className="absolute top-4 right-4 sm:right-6 lg:right-8
          flex items-center gap-2">
          
          <a href={`/api/pdf/report-card?studentProfileId=${profile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download Report Card"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20
              text-white transition-colors backdrop-blur-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Download report card"
          >
            <FileDown className="w-4 h-4" aria-hidden />
          </a>
          <Link
            href={`/school-admin/students/${user.id}/edit`}
            title="Edit student"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
              bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold
              transition-colors backdrop-blur-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <Edit className="w-3.5 h-3.5" aria-hidden />
            Edit
          </Link>
        </div>
      </div>

      {/* ── Below banner ────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 pb-5">

        {/* Avatar row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative shrink-0"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover
                  border-4 border-white shadow-xl"
              />
            ) : (
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white
                  shadow-xl flex items-center justify-center text-3xl font-black
                  text-white select-none"
                style={{
                  background: "linear-gradient(135deg, #1e40af, #8b5cf6)",
                }}
              >
                {getInitials(user.name)}
              </div>
            )}

            {/* Active indicator */}
            <div
              className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full",
                "border-2 border-white shadow-sm",
                user.isActive ? "bg-emerald-500" : "bg-gray-400",
              )}
              title={user.isActive ? "Active" : "Inactive"}
            />
          </motion.div>

          {/* Identity + badges */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                  className="text-2xl sm:text-3xl font-extrabold text-gray-900
                    tracking-tight leading-none"
                >
                  {user.name}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap items-center gap-1.5 mt-2"
                >
                  {profile.rollNumber && (
                    <span className="text-[12px] font-medium text-gray-500">
                      Roll: <span className="text-gray-800 font-semibold">{profile.rollNumber}</span>
                    </span>
                  )}
                  {profile.rollNumber && profile.admissionNo && (
                    <span className="text-gray-300">·</span>
                  )}
                  {profile.admissionNo && (
                    <span className="text-[12px] font-medium text-gray-500">
                      Adm: <span className="text-gray-800 font-semibold">{profile.admissionNo}</span>
                    </span>
                  )}
                </motion.div>

                {/* Badges row */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-wrap gap-2 mt-3"
                >
                  {section && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1
                        text-[11px] font-semibold bg-blue-50 text-blue-700
                        border border-blue-200 rounded-full">
                        {section.class.name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1
                        text-[11px] font-semibold bg-indigo-50 text-indigo-700
                        border border-indigo-200 rounded-full">
                        Section {section.name}
                      </span>
                    </>
                  )}
                  {!section && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1
                      text-[11px] font-semibold bg-amber-50 text-amber-700
                      border border-amber-200 rounded-full">
                      No Section Assigned
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1",
                      "text-[11px] font-semibold rounded-full",
                      user.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200",
                    )}
                  >
                    {user.isActive
                      ? <><CheckCircle2 className="w-3 h-3" aria-hidden /> Active</>
                      : <><XCircle className="w-3 h-3" aria-hidden /> Inactive</>}
                  </span>
                  {profile.bloodGroup && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1
                      text-[11px] font-semibold bg-red-50 text-red-600
                      border border-red-200 rounded-full">
                      <Droplets className="w-3 h-3" aria-hidden />
                      {profile.bloodGroup}
                    </span>
                  )}
                  {genderLabel && (
                    <span className="inline-flex items-center px-2.5 py-1
                      text-[11px] font-semibold bg-gray-50 text-gray-600
                      border border-gray-200 rounded-full">
                      {genderLabel}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick stat pills ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="flex flex-wrap gap-3 mt-5"
        >
          <button
            type="button"
            onClick={() => onTabChange("attendance")}
            className="focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-blue-500 rounded-xl hover:opacity-90
              transition-opacity"
          >
            <QuickStat
              icon={Calendar}
              label="Attendance"
              value={attTotal > 0 ? `${attPct}%` : "—"}
              color={cn(
                "text-white",
                attPct >= 85 ? "bg-emerald-500" : attPct >= 75 ? "bg-amber-500" : "bg-red-500",
              )}
            />
          </button>

          {overallAvg !== null && (
            <button
              type="button"
              onClick={() => onTabChange("results")}
              className="focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-500 rounded-xl hover:opacity-90
                transition-opacity"
            >
              <QuickStat
                icon={ExternalLink}
                label="Avg Score"
                value={`${overallAvg}%`}
                color={cn(
                  "text-white",
                  overallAvg >= 75 ? "bg-blue-500" : overallAvg >= 50 ? "bg-amber-500" : "bg-red-500",
                )}
              />
            </button>
          )}

          {totalFee > 0 && (
            <button
              type="button"
              onClick={() => onTabChange("fees")}
              className="focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-500 rounded-xl hover:opacity-90
                transition-opacity"
            >
              <QuickStat
                icon={ExternalLink}
                label="Fees Paid"
                value={`${feesPct}%`}
                color={feesPct >= 100 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}
              />
            </button>
          )}

          {profile.dateOfBirth && (
            <QuickStat
              icon={Calendar}
              label="Age"
              value={calcAge(profile.dateOfBirth)}
              color="bg-purple-100 text-purple-700"
            />
          )}

          {data.school && (
            <QuickStat
              icon={ExternalLink}
              label="Enrolled"
              value={fmtDate(user.createdAt).split(" ").slice(1).join(" ")}
              color="bg-gray-100 text-gray-600"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}