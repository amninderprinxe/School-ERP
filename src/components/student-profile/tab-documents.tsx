"use client";

import { useState }  from "react";
import { motion }    from "framer-motion";
import {
  FileText, Download, Loader2,
  ClipboardList, CalendarCheck, Wallet,
}                    from "lucide-react";
import type { StudentProfileData } from "./types";

// ── Fetch helper ──────────────────────────────────────────────────

async function downloadDoc(url: string, filename: string) {
  const res  = await fetch(url);
  if (!res.ok) throw new Error("Failed to generate document");
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

// ─────────────────────────────────────────────────────────────────

interface DocItem {
  id:       string;
  title:    string;
  desc:     string;
  icon:     React.ComponentType<{ className?: string }>;
  url:      string;
  filename: string;
  color:    string;
}

export function TabDocuments({ data }: { data: StudentProfileData }) {
  const { profile, user, results, attendance, feePayments } = data;

  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const docs: DocItem[] = [
    {
      id:       "report-card",
      title:    "Report Card",
      desc:     `${results.length} exam result${results.length !== 1 ? "s" : ""} · All subjects`,
      icon:     ClipboardList,
      url:      `/api/pdf/report-card?studentProfileId=${profile.id}`,
      filename: `Report-Card-${user.name.replace(/\s+/g, "-")}.pdf`,
      color:    "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
    },
    {
      id:       "attendance-report",
      title:    "Attendance Report",
      desc:     `${attendance.length} days recorded`,
      icon:     CalendarCheck,
      url:      `/api/pdf/attendance?studentProfileId=${profile.id}`,
      filename: `Attendance-${user.name.replace(/\s+/g, "-")}.pdf`,
      color:    "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    },
    {
      id:       "fee-receipt",
      title:    "Fee Receipt",
      desc:     `${feePayments.filter(p => p.status === "PAID").length} of ${feePayments.length} fees paid`,
      icon:     Wallet,
      url:      `/api/pdf/fee-receipt?studentProfileId=${profile.id}`,
      filename: `Fee-Receipt-${user.name.replace(/\s+/g, "-")}.pdf`,
      color:    "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    },
  ];

  const handleDownload = async (doc: DocItem) => {
    setDownloading(doc.id);
    setError(null);
    try {
      await downloadDoc(doc.url, doc.filename);
    } catch {
      setError(`Could not generate "${doc.title}". Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">

      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border
          border-red-200 rounded-2xl">
          <FileText className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {docs.map((doc, i) => {
          const Icon     = doc.icon;
          const isBusy   = downloading === doc.id;
          return (
            <motion.button
              key={doc.id}
              type="button"
              onClick={() => handleDownload(doc)}
              disabled={!!downloading}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl
                border transition-all duration-200 text-center cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed ${doc.color}`}
            >
              <div className="w-14 h-14 bg-white/70 rounded-2xl flex items-center
                justify-center shadow-sm">
                {isBusy
                  ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
                  : <Icon className="w-6 h-6" aria-hidden />}
              </div>
              <div>
                <p className="text-[14px] font-bold leading-snug">{doc.title}</p>
                <p className="text-[11px] opacity-70 mt-1">{doc.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                <Download className="w-3.5 h-3.5" aria-hidden />
                {isBusy ? "Generating…" : "Download PDF"}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 px-5 py-4 bg-gray-50 border
        border-gray-200 rounded-2xl">
        <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden />
        <p className="text-[13px] text-gray-500">
          Documents are generated in real-time from current data.
          All PDFs are formatted with the school name and student details.
        </p>
      </div>
    </div>
  );
}