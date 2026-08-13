"use client";

import { motion }    from "framer-motion";
import {
  Users, Phone, Mail, MapPin, Droplets,
  CalendarDays, User, Award, BookMarked,
  Info,
}                    from "lucide-react";
import { cn }        from "@/lib/utils";
import type { StudentProfileData } from "./types";

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Info row ──────────────────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, mono = false,
}: {
  icon:   React.ComponentType<{ className?: string }>;
  label:  string;
  value:  string | null;
  mono?:  boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50
      last:border-b-0">
      <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center
        justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide
          leading-none mb-1">
          {label}
        </p>
        <p className={cn(
          "text-[13px] text-gray-900 leading-snug",
          mono ? "font-mono font-semibold" : "font-medium",
          !value && "text-gray-400",
        )}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, children, delay = 0,
}: {
  title:    string;
  icon:     React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?:   number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center
          justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-blue-600" aria-hidden />
        </div>
        <p className="text-[13px] font-bold text-gray-900">{title}</p>
      </div>
      <div className="px-5 py-2">{children}</div>
    </motion.div>
  );
}

// ── Achievement card ──────────────────────────────────────────────

function AchievementBadge({
  label, value, color, sub,
}: {
  label: string; value: string;
  color: "blue" | "green" | "amber" | "purple" | "red";
  sub?: string;
}) {
  const C = {
    blue:   { bg: "bg-blue-50",    text: "text-blue-700",   val: "text-blue-900"   },
    green:  { bg: "bg-emerald-50", text: "text-emerald-700",val: "text-emerald-900" },
    amber:  { bg: "bg-amber-50",   text: "text-amber-700",  val: "text-amber-900"  },
    purple: { bg: "bg-purple-50",  text: "text-purple-700", val: "text-purple-900" },
    red:    { bg: "bg-red-50",     text: "text-red-600",    val: "text-red-900"    },
  }[color];

  return (
    <div className={cn("rounded-xl p-4 border border-transparent", C.bg)}>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest", C.text)}>
        {label}
      </p>
      <p className={cn("text-2xl font-extrabold mt-1 leading-none", C.val)}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function TabOverview({ data }: { data: StudentProfileData }) {
  const { user, profile, section, attendance, results, feePayments } = data;

  // ── Derived insights ──────────────────────────────────────────
  const attTotal   = attendance.length;
  const attPresent = attendance.filter((a) => a.status === "PRESENT").length;
  const attAbsent  = attendance.filter((a) => a.status === "ABSENT").length;
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const overallAvg = results.length > 0
    ? Math.round(results.reduce((s, r) =>
        s + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0
      ) / results.length)
    : null;

  // Best + worst subject
  const subjectMap = new Map<string, { sum: number; count: number }>();
  for (const r of results) {
    const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
    const cur = subjectMap.get(r.subject.name) ?? { sum: 0, count: 0 };
    subjectMap.set(r.subject.name, { sum: cur.sum + pct, count: cur.count + 1 });
  }
  const subjectAvgs = Array.from(subjectMap.entries())
    .map(([name, v]) => ({ name, avg: Math.round(v.sum / v.count) }))
    .sort((a, b) => b.avg - a.avg);
  const bestSubject  = subjectAvgs[0]   ?? null;
  const worstSubject = subjectAvgs[subjectAvgs.length - 1] ?? null;

  const totalFee  = feePayments.reduce((s, p) => s + p.feeStructure.amount, 0);
  const totalPaid = feePayments.reduce((s, p) => s + p.amountPaid, 0);
  const feesPct   = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 100;

  const GENDER_LABEL: Record<string, string> = {
    MALE: "Male", FEMALE: "Female", OTHER: "Other",
  };

  return (
    <div className="space-y-5">

      {/* ── Achievement strip ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AchievementBadge
          label="Attendance"
          value={attTotal > 0 ? `${attPct}%` : "—"}
          sub={`${attPresent}/${attTotal} days`}
          color={attPct >= 85 ? "green" : attPct >= 75 ? "amber" : "red"}
        />
        <AchievementBadge
          label="Avg Score"
          value={overallAvg !== null ? `${overallAvg}%` : "—"}
          sub={results.length > 0 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "No results"}
          color={overallAvg !== null ? (overallAvg >= 75 ? "blue" : overallAvg >= 50 ? "amber" : "red") : "purple"}
        />
        <AchievementBadge
          label="Fees Paid"
          value={totalFee > 0 ? `${feesPct}%` : "—"}
          sub={totalFee > 0 ? `${feePayments.filter(p => p.status === "PAID").length} of ${feePayments.length} paid` : "No dues"}
          color={feesPct >= 100 ? "green" : "amber"}
        />
        <AchievementBadge
          label="Absences"
          value={String(attAbsent)}
          sub="this year"
          color={attAbsent === 0 ? "green" : attAbsent <= 5 ? "amber" : "red"}
        />
      </div>

      {/* ── Two column grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Personal details */}
        <SectionCard title="Personal Details" icon={User} delay={0.05}>
          <InfoRow icon={CalendarDays} label="Date of Birth"
            value={fmtDate(profile.dateOfBirth)} />
          <InfoRow icon={User}         label="Gender"
            value={user.gender ? GENDER_LABEL[user.gender] ?? user.gender : null} />
          <InfoRow icon={Droplets}     label="Blood Group"
            value={profile.bloodGroup} />
          <InfoRow icon={Info}         label="Roll Number"
            value={profile.rollNumber} mono />
          <InfoRow icon={Info}         label="Admission No."
            value={profile.admissionNo} mono />
          <InfoRow icon={MapPin}       label="Address"
            value={profile.address} />
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Student contact */}
        <SectionCard title="Contact Information" icon={Phone} delay={0.15}>
          <InfoRow icon={Mail}    label="Email"  value={user.email} />
          <InfoRow icon={Phone}   label="Phone"  value={user.phone} />
          <InfoRow icon={MapPin}  label="Address" value={profile.address} />
        </SectionCard>

        {/* Academic snapshot */}
        <SectionCard title="Academic Insights" icon={BookMarked} delay={0.2}>
          {section ? (
            <>
              <InfoRow icon={BookMarked} label="Class"
                value={`${section.class.name} — Section ${section.name}`} />
              {bestSubject && (
                <InfoRow icon={Award} label="Best Subject"
                  value={`${bestSubject.name} (${bestSubject.avg}%)`} />
              )}
              {worstSubject && worstSubject.name !== bestSubject?.name && (
                <InfoRow icon={Award} label="Needs Improvement"
                  value={`${worstSubject.name} (${worstSubject.avg}%)`} />
              )}
              {results.length > 0 && (
                <InfoRow icon={Award} label="Total Exams"
                  value={`${results.length} result${results.length !== 1 ? "s" : ""} recorded`} />
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <BookMarked className="w-8 h-8 text-gray-200 mx-auto mb-2" aria-hidden />
              <p className="text-sm text-gray-400">Not enrolled in any class</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  </div>
  );
}
