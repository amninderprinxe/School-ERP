// ── Shared PDF design tokens ──────────────────────────────────────

export const C = {
  primary: "#1e40af",
  primaryMid: "#3b82f6",
  primaryLight: "#dbeafe",

  secondary: "#1e293b",

  muted: "#64748b",
  mutedLight: "#f1f5f9",

  border: "#e2e8f0",

  white: "#ffffff",
  black: "#0f172a",

  green: "#15803d",
  greenLight: "#dcfce7",

  red: "#b91c1c",
  redLight: "#fee2e2",

  amber: "#b45309",
  amberLight: "#fef3c7",

  blue: "#1d4ed8",
  blueLight: "#eff6ff",
} as const;

// Built-in React PDF fonts
export const F = {
  normal: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
} as const;

// A4 PDF padding
export const PAD = 32;

// A4 width in points
export const WIDTH = {
  page: 595.28,
  content: 595.28 - PAD * 2,
} as const;

// ── Date formatter ────────────────────────────────────────────────

export function fmtPdfDate(
  value: Date | string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// ── Currency formatter ────────────────────────────────────────────

export function fmtPdfCurrency(
  value: number | string | null | undefined,
): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Number formatter ──────────────────────────────────────────────

export function fmtNum(
  value: number | string | null | undefined,
  decimals = 0,
): string {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numberValue);
}

// ── Percentage formatter ──────────────────────────────────────────

export function fmtPct(
  obtained: number | string | null | undefined,
  maximum: number | string | null | undefined,
): string {
  const obtainedValue = Number(obtained ?? 0);
  const maximumValue = Number(maximum ?? 0);

  if (
    !Number.isFinite(obtainedValue) ||
    !Number.isFinite(maximumValue) ||
    maximumValue <= 0
  ) {
    return "0.00%";
  }

  const percentage =
    (obtainedValue / maximumValue) * 100;

  return `${percentage.toFixed(2)}%`;
}