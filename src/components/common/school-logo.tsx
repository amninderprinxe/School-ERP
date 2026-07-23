"use client";

import { useState } from "react";

interface SchoolLogoProps {
  schoolName: string;
  schoolCode?: string | null;
  size?: number;
  className?: string;
}

export function SchoolLogo({
  schoolName,
  schoolCode,
  size = 36,
  className = "",
}: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);

  const safeCode = schoolCode?.trim();
  const logoSrc = safeCode
    ? `/uploads/schools/${safeCode}.png`
    : null;

  const initial =
    schoolName?.trim()?.charAt(0)?.toUpperCase() || "S";

  if (!logoSrc || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold ${className}`}
        style={{ width: size, height: size, minWidth: size }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={`${schoolName} logo`}
      width={size}
      height={size}
      className={`rounded-full object-contain bg-white border border-gray-200 ${className}`}
      style={{ width: size, height: size, minWidth: size }}
      onError={() => setFailed(true)}
    />
  );
}
