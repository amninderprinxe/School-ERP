"use client";

import { useState }  from "react";
import { FileDown }  from "lucide-react";

interface Props {
  href:     string;
  label?:   string;
  variant?: "icon" | "button";
}

export function PdfDownloadButton({
  href,
  label   = "Download PDF",
  variant = "button",
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const text = await res.text();
        alert(`Could not generate PDF: ${text}`);
        return;
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      // Extract filename from Content-Disposition if present
      const cd       = res.headers.get("Content-Disposition") ?? "";
      const fnMatch  = cd.match(/filename="([^"]+)"/);
      a.href         = url;
      a.download     = fnMatch?.[1] ?? "download.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error — could not download PDF.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={label}
        aria-label={label}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50
          disabled:opacity-50 rounded-lg transition-colors"
      >
        <FileDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
        font-semibold text-red-700 bg-red-50 hover:bg-red-100
        disabled:opacity-50 rounded-lg transition-colors border
        border-red-200"
    >
      <FileDown className="w-4 h-4" />
      {loading ? "Generating…" : label}
    </button>
  );
}
