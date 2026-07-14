import { z } from "zod";

export const PAYMENT_MODES = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "OTHER",
] as const;

export const FeeCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),

  description: z
    .string()
    .trim()
    .max(300, "Description is too long")
    .optional(),
});

export const FeeStructureSchema = z.object({
  feeCategoryId: z.string().min(1, "Please select a fee category"),

  classId: z.string().optional(),

  amount: z.coerce
    .number()
    .min(1, "Amount must be at least ₹1")
    .max(9_999_999, "Amount is too large"),

  academicYear: z
    .string()
    .trim()
    .min(4, "Academic year is required")
    .max(10, "Academic year is too long"),

  dueDate: z.string().optional(),

  description: z
    .string()
    .trim()
    .max(300, "Description is too long")
    .optional(),
});

export const RecordPaymentSchema = z
  .object({
    studentProfileId: z.string().min(1, "Student is required"),

    feeStructureId: z.string().min(1, "Fee structure is required"),

    amountPaid: z.coerce
      .number()
      .min(0, "Amount cannot be negative"),

    waivedAmount: z.coerce
      .number()
      .min(0, "Waived amount cannot be negative")
      .default(0),

    paymentMode: z.enum(PAYMENT_MODES),

    paymentDate: z.string().min(1, "Payment date is required"),

    transactionRef: z
      .string()
      .trim()
      .max(100, "Reference is too long")
      .optional(),

    remarks: z
      .string()
      .trim()
      .max(300, "Remarks are too long")
      .optional(),
  })
  .refine(
    (data) => data.amountPaid + data.waivedAmount > 0,
    {
      message: "Paid amount or waived amount must be greater than zero",
      path: ["amountPaid"],
    },
  );

export type FeeCategoryInput = z.infer<typeof FeeCategorySchema>;
export type FeeStructureInput = z.infer<typeof FeeStructureSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;