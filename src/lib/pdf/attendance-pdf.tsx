
import type React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import {
  C,
  F,
  PAD,
  fmtPdfDate,
} from "./tokens";

// ── Data types ────────────────────────────────────────────────────

export interface AttPdfRecord {
  date: Date;
  status: string;
  remarks: string | null;
}

export interface AttPdfData {
  schoolName: string;
  studentName: string;
  rollNumber: string | null;
  className: string | null;
  sectionName: string | null;
  monthLabel: string;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number;
  percentage: number;
  records: AttPdfRecord[];
  generatedAt: Date;
}

// ── Status configuration ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PRESENT: C.green,
  ABSENT: C.red,
  LATE: C.amber,
  HALF_DAY: C.blue,
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half Day",
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
    paddingBottom: 48,
  },

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

  infoBox: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    backgroundColor: C.mutedLight,
    padding: 10,
    marginBottom: 12,
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

  // ── Summary boxes ────────────────────────────────────────────

  summaryRow: {
    flexDirection: "row" as const,
    marginBottom: 12,
  },

  summaryBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center" as const,
    borderRadius: 4,
    borderWidth: 0.5,
    borderStyle: "solid" as const,
    borderColor: C.border,
  },

  summaryVal: {
    fontFamily: F.bold,
    fontSize: 14,
  },

  summaryLabel: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 2,
    textAlign: "center" as const,
  },

  // ── Table ────────────────────────────────────────────────────

  table: {
    marginBottom: 8,
  },

  tableHead: {
    flexDirection: "row" as const,
    backgroundColor: C.primary,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },

  tableRow: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid" as const,
    minHeight: 22,
  },

  tableRowAlt: {
    backgroundColor: C.mutedLight,
  },

  thCell: {
    fontFamily: F.bold,
    fontSize: 8,
    color: C.white,
  },

  tdCell: {
    fontSize: 8,
    color: C.black,
  },

  colDate: {
    width: 80,
  },

  colDay: {
    width: 60,
  },

  colStatus: {
    width: 70,
  },

  colRemarks: {
    flex: 1,
  },

  emptyState: {
    paddingVertical: 14,
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

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function dayLabel(value: Date | string): string {
  const date = toValidDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  });
}

function fmtAttDate(value: Date | string): string {
  const date = toValidDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// ── Component ─────────────────────────────────────────────────────

export function AttendancePDF({
  data,
}: {
  data: AttPdfData;
}): React.ReactElement<DocumentProps> {
  const safePercentage = Number.isFinite(data.percentage)
    ? Math.max(0, Math.min(100, data.percentage))
    : 0;

  const summaryItems = [
    {
      label: "Present",
      value: data.present,
      color: C.green,
      bg: C.greenLight,
    },
    {
      label: "Absent",
      value: data.absent,
      color: C.red,
      bg: C.redLight,
    },
    {
      label: "Late",
      value: data.late,
      color: C.amber,
      bg: C.amberLight,
    },
    {
      label: "Half Day",
      value: data.halfDay,
      color: C.blue,
      bg: C.blueLight,
    },
    {
      label: "Total",
      value: data.total,
      color: C.secondary,
      bg: C.mutedLight,
    },
    {
      label: "Attendance %",
      value: `${safePercentage.toFixed(2)}%`,
      color: safePercentage >= 75 ? C.green : C.red,
      bg: safePercentage >= 75 ? C.greenLight : C.redLight,
    },
  ];

  return (
    <Document
      title="Attendance Report"
      author={data.schoolName}
      subject={`${data.studentName} attendance report`}
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ───────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.schoolName}>{data.schoolName}</Text>

            <Text style={s.schoolSub}>
              Student Attendance Report
            </Text>
          </View>

          <View>
            <Text style={s.docTitle}>
              ATTENDANCE REPORT
            </Text>

            <Text style={s.docSub}>
              {data.monthLabel}
            </Text>

            <Text style={s.docSub}>
              Generated: {fmtPdfDate(data.generatedAt)}
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
              label: "Roll Number",
              value: data.rollNumber ?? "—",
            },
            {
              label: "Class",
              value: data.className ?? "—",
            },
            {
              label: "Section",
              value: data.sectionName ?? "—",
            },
          ].map((item) => (
            <View key={item.label} style={s.infoCell}>
              <Text style={s.infoLabel}>
                {item.label}:
              </Text>

              <Text style={s.infoVal}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Attendance summary ────────────────────────────── */}
        <View style={s.summaryRow} wrap={false}>
          {summaryItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                s.summaryBox,
                {
                  backgroundColor: item.bg,
                  borderColor: item.color,
                  marginRight:
                    index < summaryItems.length - 1 ? 6 : 0,
                },
              ]}
            >
              <Text
                style={[
                  s.summaryVal,
                  {
                    color: item.color,
                  },
                ]}
              >
                {item.value}
              </Text>

              <Text style={s.summaryLabel}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Attendance records table ──────────────────────── */}
        <View style={s.table}>
          <View style={s.tableHead} fixed>
            <Text style={[s.thCell, s.colDate]}>
              Date
            </Text>

            <Text style={[s.thCell, s.colDay]}>
              Day
            </Text>

            <Text style={[s.thCell, s.colStatus]}>
              Status
            </Text>

            <Text style={[s.thCell, s.colRemarks]}>
              Remarks
            </Text>
          </View>

          {data.records.length > 0 ? (
            data.records.map((record, index) => (
              <View
                key={`${record.date.toString()}-${index}`}
                wrap={false}
                style={[
                  s.tableRow,
                  index % 2 !== 0 ? s.tableRowAlt : {},
                ]}
              >
                <Text style={[s.tdCell, s.colDate]}>
                  {fmtAttDate(record.date)}
                </Text>

                <Text style={[s.tdCell, s.colDay]}>
                  {dayLabel(record.date)}
                </Text>

                <Text
                  style={[
                    s.tdCell,
                    s.colStatus,
                    {
                      fontFamily: F.bold,
                      color:
                        STATUS_COLORS[record.status] ??
                        C.muted,
                    },
                  ]}
                >
                  {STATUS_LABELS[record.status] ??
                    record.status ??
                    "Unknown"}
                </Text>

                <Text style={[s.tdCell, s.colRemarks]}>
                  {record.remarks?.trim() || "—"}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>
                No attendance records for this period.
              </Text>
            </View>
          )}
        </View>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.schoolName} · {data.studentName} ·{" "}
            {data.monthLabel}
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
