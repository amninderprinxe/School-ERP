import type { PaymentStatus } from "@prisma/client";

export function calcOutstanding(
  amount:       number,
  amountPaid:   number,
  waivedAmount: number,
): number {
  return Math.max(0, amount - amountPaid - waivedAmount);
}

export function calcNewStatus(
  amount:       number,
  amountPaid:   number,
  waivedAmount: number,
): PaymentStatus {
  const outstanding = calcOutstanding(amount, amountPaid, waivedAmount);
  if (waivedAmount >= amount) return "WAIVED";
  if (outstanding <= 0)       return "PAID";
  if (amountPaid > 0)         return "PARTIAL";
  return "PENDING";
}

export function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0]!;
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE:        "Cheque",
  ONLINE:        "Online",
};

export const PAYMENT_MODES = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
] as const;

export const STATUS_STYLE: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PARTIAL: "bg-blue-50  text-blue-700  border border-blue-200",
  PAID:    "bg-green-50 text-green-700 border border-green-200",
  WAIVED:  "bg-gray-100 text-gray-600  border border-gray-200",
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID:    "Paid",
  WAIVED:  "Waived",
};
