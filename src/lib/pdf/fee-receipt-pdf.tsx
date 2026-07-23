import type React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import {
  C,
  F,
  PAD,
  fmtPdfDate,
  fmtPdfCurrency,
} from "./tokens";

// ── Data types ────────────────────────────────────────────────────

export interface FeeReceiptPayment {
  categoryName: string;
  structureDesc: string | null;
  academicYear: string;
  className: string | null;
  structureAmount: number;
  amountPaid: number;
  waivedAmount: number;
  outstanding: number;
  status: string;
  paymentDate: Date | null;
  paymentMode: string;
  transactionRef: string | null;
  remarks: string | null;
}

export interface FeeReceiptData {
  schoolName: string;
  schoolLogo: string | null;

  studentName: string;
  rollNumber: string | null;
  admissionNo: string | null;
  className: string | null;
  sectionName: string | null;

  payments: FeeReceiptPayment[];
  generatedAt: Date;
}

// ── Status configuration ──────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  {
    color: string;
    bg: string;
  }
> = {
  PAID: {
    color: C.green,
    bg: C.greenLight,
  },
  PARTIAL: {
    color: C.primary,
    bg: C.primaryLight,
  },
  PENDING: {
    color: C.amber,
    bg: C.amberLight,
  },
  WAIVED: {
    color: C.muted,
    bg: C.mutedLight,
  },
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online",
};

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: F.normal,
    fontSize: 9,
    color: C.black,
    backgroundColor: C.white,

    paddingTop: PAD,
    paddingHorizontal: PAD,
    paddingBottom: 52,
  },

  // ── Header ────────────────────────────────────────────────────

  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "flex-start",

    marginBottom: 14,
    paddingBottom: 12,

    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    borderBottomStyle: "solid" as const,
  },

  schoolIdentity: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    paddingRight: 12,
  },

  logo: {
    width: 46,
    height: 46,
    objectFit: "contain" as const,
    marginRight: 10,
  },

  logoFallback: {
    width: 46,
    height: 46,
    marginRight: 10,

    borderRadius: 23,
    backgroundColor: C.primaryLight,

    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  logoFallbackText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: C.primary,
  },

  schoolTextContainer: {
    flex: 1,
  },

  schoolName: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.primary,
  },

  schoolSub: {
    fontSize: 8,
    color: C.muted,
    marginTop: 3,
  },

  documentInformation: {
    alignItems: "flex-end" as const,
  },

  docTitle: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.secondary,
    textAlign: "right" as const,
  },

  docSub: {
    fontSize: 8,
    color: C.muted,
    textAlign: "right" as const,
    marginTop: 2,
  },

  // ── Student information ──────────────────────────────────────

  infoBox: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,

    backgroundColor: C.mutedLight,
    padding: 10,
    marginBottom: 14,
    borderRadius: 4,
  },

  infoCell: {
    width: "50%",
    flexDirection: "row" as const,
    marginBottom: 4,
  },

  infoLabel: {
    fontFamily: F.bold,
    width: 88,
    color: C.muted,
    fontSize: 8,
  },

  infoVal: {
    flex: 1,
    fontSize: 8,
    color: C.black,
  },

  // ── Fee table ────────────────────────────────────────────────

  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 9,

    color: C.white,
    backgroundColor: C.primary,

    padding: 6,
    marginTop: 4,
    borderRadius: 3,
  },

  table: {
    marginBottom: 0,
  },

  tableHead: {
    flexDirection: "row" as const,
    backgroundColor: C.primaryLight,

    paddingVertical: 5,
    paddingHorizontal: 6,

    borderBottomWidth: 1,
    borderBottomColor: C.primary,
    borderBottomStyle: "solid" as const,
  },

  tableRow: {
    flexDirection: "row" as const,

    paddingVertical: 5,
    paddingHorizontal: 6,

    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid" as const,

    minHeight: 28,
  },

  tableRowAlt: {
    backgroundColor: C.mutedLight,
  },

  thCell: {
    fontFamily: F.bold,
    fontSize: 7.5,
    color: C.primary,
  },

  tdCell: {
    fontSize: 8,
    color: C.black,
  },

  categoryName: {
    fontFamily: F.bold,
    fontSize: 8,
    color: C.black,
  },

  categoryDescription: {
    fontSize: 7,
    color: C.muted,
    marginTop: 1,
  },

  colFee: {
    flex: 1,
    paddingRight: 4,
  },

  colYear: {
    width: 48,
  },

  colClass: {
    width: 58,
  },

  colAmt: {
    width: 58,
    textAlign: "right" as const,
  },

  colPaid: {
    width: 52,
    textAlign: "right" as const,
  },

  colOuts: {
    width: 58,
    textAlign: "right" as const,
  },

  colStat: {
    width: 48,
    textAlign: "center" as const,
  },

  statusContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  statusBadge: {
    fontSize: 7,
    fontFamily: F.bold,

    paddingVertical: 2,
    paddingHorizontal: 4,

    borderRadius: 2,
    textAlign: "center" as const,
  },

  emptyState: {
    paddingVertical: 16,
    paddingHorizontal: 10,

    alignItems: "center" as const,

    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid" as const,
  },

  emptyStateText: {
    fontSize: 8,
    color: C.muted,
  },

  // ── Totals ───────────────────────────────────────────────────

  totalsRow: {
    flexDirection: "row" as const,
    justifyContent: "flex-end",

    paddingVertical: 10,
    paddingHorizontal: 10,

    backgroundColor: C.primaryLight,

    borderTopWidth: 1.5,
    borderTopColor: C.primary,
    borderTopStyle: "solid" as const,
  },

  totalItem: {
    alignItems: "flex-end" as const,
    marginLeft: 20,
  },

  totalVal: {
    fontFamily: F.bold,
    fontSize: 13,
    color: C.primary,
  },

  totalLabel: {
    fontSize: 7,
    color: C.muted,
    marginTop: 1,
  },

  // ── Payment details ──────────────────────────────────────────

  paymentDetails: {
    marginTop: 12,

    flexDirection: "row" as const,
    flexWrap: "wrap" as const,

    backgroundColor: C.mutedLight,
    padding: 10,
    borderRadius: 4,
  },

  payCell: {
    width: "33.33%",
    marginBottom: 7,
    paddingRight: 6,
  },

  payCellFull: {
    width: "100%",
    marginBottom: 4,
  },

  payLabel: {
    fontFamily: F.bold,
    fontSize: 7,
    color: C.muted,
  },

  payVal: {
    fontSize: 8,
    color: C.black,
    marginTop: 1,
  },

  // ── Signature ────────────────────────────────────────────────

  signRow: {
    marginTop: 28,

    flexDirection: "row" as const,
    justifyContent: "flex-end",
  },

  signBox: {
    width: 160,

    alignItems: "center" as const,

    paddingTop: 8,

    borderTopWidth: 1,
    borderTopColor: C.secondary,
    borderTopStyle: "solid" as const,
  },

  signLabel: {
    fontFamily: F.bold,
    fontSize: 8,
    color: C.secondary,
  },

  // ── Footer ───────────────────────────────────────────────────

  footer: {
    position: "absolute" as const,

    bottom: 22,
    left: PAD,
    right: PAD,

    flexDirection: "row" as const,
    justifyContent: "space-between",

    borderTopWidth: 0.5,
    borderTopColor: C.border,
    borderTopStyle: "solid" as const,

    paddingTop: 6,
  },

  footerText: {
    fontSize: 7,
    color: C.muted,
  },
});

// ── Helpers ───────────────────────────────────────────────────────

function uniqueNonEmptyValues(
  values: Array<string | null | undefined>,
): string[] {
  const cleanedValues = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(cleanedValues));
}

function createReceiptReference(date: Date): string {
  const timestamp = date.getTime().toString(36).toUpperCase();

  return `FR-${timestamp}`;
}

function safeSchoolInitial(schoolName: string): string {
  const trimmedName = schoolName.trim();

  if (!trimmedName) {
    return "S";
  }

  return trimmedName.charAt(0).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────

export function FeeReceiptPDF({
  data,
}: {
  data: FeeReceiptData;
}): React.ReactElement<DocumentProps> {
  const totalDue = data.payments.reduce(
    (sum, payment) =>
      sum + Number(payment.structureAmount || 0),
    0,
  );

  const totalPaid = data.payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amountPaid || 0),
    0,
  );

  const totalWaived = data.payments.reduce(
    (sum, payment) =>
      sum + Number(payment.waivedAmount || 0),
    0,
  );

  const totalOutstanding = data.payments.reduce(
    (sum, payment) =>
      sum + Math.max(0, Number(payment.outstanding || 0)),
    0,
  );

  const paymentModes = uniqueNonEmptyValues(
    data.payments.map((payment) => {
      const rawMode = payment.paymentMode?.trim();

      if (!rawMode) {
        return null;
      }

      return PAYMENT_MODE_LABELS[rawMode] ?? rawMode;
    }),
  );

  const paymentDates = uniqueNonEmptyValues(
    data.payments
      .filter((payment) => payment.paymentDate)
      .map((payment) =>
        payment.paymentDate
          ? fmtPdfDate(payment.paymentDate)
          : null,
      ),
  );

  const transactionReferences = uniqueNonEmptyValues(
    data.payments.map(
      (payment) => payment.transactionRef,
    ),
  );

  const remarks = uniqueNonEmptyValues(
    data.payments.map((payment) => payment.remarks),
  );

  const hasPaymentDetails =
    paymentModes.length > 0 ||
    paymentDates.length > 0 ||
    transactionReferences.length > 0 ||
    totalWaived > 0 ||
    remarks.length > 0;

  const receiptReference = createReceiptReference(
    data.generatedAt,
  );

  return (
    <Document
      title="Fee Receipt"
      author={data.schoolName}
      subject={`${data.studentName} fee receipt`}
      creator="School ERP"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ───────────────────────────────────────── */}
        <View style={s.header} wrap={false}>
          <View style={s.schoolIdentity}>
            {data.schoolLogo ? (
              <Image
                src={data.schoolLogo}
                style={s.logo}
              />
            ) : (
              <View style={s.logoFallback}>
                <Text style={s.logoFallbackText}>
                  {safeSchoolInitial(data.schoolName)}
                </Text>
              </View>
            )}

            <View style={s.schoolTextContainer}>
              <Text style={s.schoolName}>
                {data.schoolName || "School"}
              </Text>

              <Text style={s.schoolSub}>
                Official Fee Receipt
              </Text>
            </View>
          </View>

          <View style={s.documentInformation}>
            <Text style={s.docTitle}>
              FEE RECEIPT
            </Text>

            <Text style={s.docSub}>
              Date: {fmtPdfDate(data.generatedAt)}
            </Text>

            <Text style={s.docSub}>
              Ref: {receiptReference}
            </Text>
          </View>
        </View>

        {/* ── Student information ───────────────────────────── */}
        <View style={s.infoBox} wrap={false}>
          {[
            {
              label: "Student Name",
              value: data.studentName || "—",
            },
            {
              label: "Class",
              value: data.className ?? "—",
            },
            {
              label: "Section",
              value: data.sectionName ?? "—",
            },
            {
              label: "Roll Number",
              value: data.rollNumber ?? "—",
            },
            {
              label: "Admission No.",
              value: data.admissionNo ?? "—",
            },
          ].map((item) => (
            <View
              key={item.label}
              style={s.infoCell}
            >
              <Text style={s.infoLabel}>
                {item.label}:
              </Text>

              <Text style={s.infoVal}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Fee details ───────────────────────────────────── */}
        <Text style={s.sectionTitle}>
          Fee Details
        </Text>

        <View style={s.table}>
          <View style={s.tableHead} fixed>
            <Text style={[s.thCell, s.colFee]}>
              Fee Category
            </Text>

            <Text style={[s.thCell, s.colYear]}>
              Year
            </Text>

            <Text style={[s.thCell, s.colClass]}>
              Class
            </Text>

            <Text style={[s.thCell, s.colAmt]}>
              Due
            </Text>

            <Text style={[s.thCell, s.colPaid]}>
              Paid
            </Text>

            <Text style={[s.thCell, s.colOuts]}>
              Balance
            </Text>

            <Text style={[s.thCell, s.colStat]}>
              Status
            </Text>
          </View>

          {data.payments.length > 0 ? (
            data.payments.map((payment, index) => {
              const statusStyle =
                STATUS_STYLES[payment.status] ?? {
                  color: C.muted,
                  bg: C.mutedLight,
                };

              return (
                <View
                  key={`${payment.categoryName}-${index}`}
                  wrap={false}
                  style={[
                    s.tableRow,
                    index % 2 !== 0
                      ? s.tableRowAlt
                      : {},
                  ]}
                >
                  <View style={s.colFee}>
                    <Text style={s.categoryName}>
                      {payment.categoryName || "Fee"}
                    </Text>

                    {payment.structureDesc?.trim() && (
                      <Text style={s.categoryDescription}>
                        {payment.structureDesc.trim()}
                      </Text>
                    )}
                  </View>

                  <Text style={[s.tdCell, s.colYear]}>
                    {payment.academicYear || "—"}
                  </Text>

                  <Text style={[s.tdCell, s.colClass]}>
                    {payment.className ?? "All"}
                  </Text>

                  <Text style={[s.tdCell, s.colAmt]}>
                    {fmtPdfCurrency(
                      payment.structureAmount,
                    )}
                  </Text>

                  <Text
                    style={[
                      s.tdCell,
                      s.colPaid,
                      {
                        color: C.green,
                        fontFamily: F.bold,
                      },
                    ]}
                  >
                    {fmtPdfCurrency(payment.amountPaid)}
                  </Text>

                  <Text
                    style={[
                      s.tdCell,
                      s.colOuts,
                      {
                        color:
                          payment.outstanding > 0
                            ? C.red
                            : C.green,
                        fontFamily: F.bold,
                      },
                    ]}
                  >
                    {payment.outstanding > 0
                      ? fmtPdfCurrency(
                          payment.outstanding,
                        )
                      : "Nil"}
                  </Text>

                  <View
                    style={[
                      s.colStat,
                      s.statusContainer,
                    ]}
                  >
                    <Text
                      style={[
                        s.statusBadge,
                        {
                          color: statusStyle.color,
                          backgroundColor:
                            statusStyle.bg,
                        },
                      ]}
                    >
                      {payment.status || "UNKNOWN"}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>
                No fee records available.
              </Text>
            </View>
          )}
        </View>

        {/* ── Totals ───────────────────────────────────────── */}
        <View style={s.totalsRow} wrap={false}>
          <View style={s.totalItem}>
            <Text style={s.totalVal}>
              {fmtPdfCurrency(totalDue)}
            </Text>

            <Text style={s.totalLabel}>
              Total Fee
            </Text>
          </View>

          <View style={s.totalItem}>
            <Text
              style={[
                s.totalVal,
                {
                  color: C.green,
                },
              ]}
            >
              {fmtPdfCurrency(totalPaid)}
            </Text>

            <Text style={s.totalLabel}>
              Total Paid
            </Text>
          </View>

          {totalWaived > 0 && (
            <View style={s.totalItem}>
              <Text
                style={[
                  s.totalVal,
                  {
                    color: C.blue,
                  },
                ]}
              >
                {fmtPdfCurrency(totalWaived)}
              </Text>

              <Text style={s.totalLabel}>
                Total Waived
              </Text>
            </View>
          )}

          <View style={s.totalItem}>
            <Text
              style={[
                s.totalVal,
                {
                  color:
                    totalOutstanding > 0
                      ? C.red
                      : C.green,
                },
              ]}
            >
              {totalOutstanding > 0
                ? fmtPdfCurrency(totalOutstanding)
                : "Nil"}
            </Text>

            <Text style={s.totalLabel}>
              Outstanding Balance
            </Text>
          </View>
        </View>

        {/* ── Payment details ──────────────────────────────── */}
        {hasPaymentDetails && (
          <View style={s.paymentDetails} wrap={false}>
            {paymentModes.length > 0 && (
              <View style={s.payCell}>
                <Text style={s.payLabel}>
                  Payment Mode
                </Text>

                <Text style={s.payVal}>
                  {paymentModes.join(", ")}
                </Text>
              </View>
            )}

            {paymentDates.length > 0 && (
              <View style={s.payCell}>
                <Text style={s.payLabel}>
                  Payment Date
                </Text>

                <Text style={s.payVal}>
                  {paymentDates.join(", ")}
                </Text>
              </View>
            )}

            {transactionReferences.length > 0 && (
              <View style={s.payCell}>
                <Text style={s.payLabel}>
                  Transaction Reference
                </Text>

                <Text style={s.payVal}>
                  {transactionReferences.join(", ")}
                </Text>
              </View>
            )}

            {totalWaived > 0 && (
              <View style={s.payCell}>
                <Text style={s.payLabel}>
                  Waived Amount
                </Text>

                <Text style={s.payVal}>
                  {fmtPdfCurrency(totalWaived)}
                </Text>
              </View>
            )}

            {remarks.length > 0 && (
              <View style={s.payCellFull}>
                <Text style={s.payLabel}>
                  Remarks
                </Text>

                <Text style={s.payVal}>
                  {remarks.join(" • ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Signature ────────────────────────────────────── */}
        <View style={s.signRow} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.signLabel}>
              Authorised Signatory
            </Text>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Computer-generated receipt · {data.schoolName}
          </Text>

          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}