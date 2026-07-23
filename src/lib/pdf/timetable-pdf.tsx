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
} from "./tokens";

// ── Data types ────────────────────────────────────────────────────

export interface TimetablePeriodRow {
  dayOfWeek: string;
  periodNumber: number;
  startTime: string | null;
  endTime: string | null;
  subjectName: string | null;
  subjectCode: string | null;
  teacherName: string | null;
}

export interface TimetablePdfData {
  schoolName: string;
  schoolLogo: string | null;

  className: string;
  sectionName: string;
  academicYear: string | null;

  periods: TimetablePeriodRow[];
  generatedAt: Date;
}

// ── Timetable configuration ───────────────────────────────────────

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: F.normal,
    fontSize: 8.5,
    color: C.black,
    backgroundColor: C.white,

    paddingTop: PAD,
    paddingHorizontal: PAD,
    paddingBottom: 50,
  },

  // ── Header ────────────────────────────────────────────────────

  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "flex-start",

    marginBottom: 12,
    paddingBottom: 10,

    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    borderBottomStyle: "solid" as const,
  },

  schoolIdentity: {
    flexDirection: "row" as const,
    alignItems: "center" as const,

    flex: 1,
    paddingRight: 14,
  },

  logo: {
    width: 44,
    height: 44,

    objectFit: "contain" as const,
    marginRight: 10,
  },

  logoFallback: {
    width: 44,
    height: 44,
    marginRight: 10,

    borderRadius: 22,
    backgroundColor: C.primaryLight,

    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  logoFallbackText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.primary,
  },

  schoolTextContainer: {
    flex: 1,
  },

  schoolName: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.primary,
  },

  schoolSub: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },

  documentInformation: {
    alignItems: "flex-end" as const,
  },

  docTitle: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.secondary,
    textAlign: "right" as const,
  },

  docSub: {
    fontSize: 8,
    color: C.muted,
    textAlign: "right" as const,
    marginTop: 2,
  },

  // ── Grid ──────────────────────────────────────────────────────

  grid: {
    marginTop: 10,
  },

  gridHead: {
    flexDirection: "row" as const,
    backgroundColor: C.primary,

    paddingVertical: 5,
    paddingHorizontal: 0,
  },

  gridRow: {
    flexDirection: "row" as const,

    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid" as const,

    minHeight: 36,
  },

  gridRowAlt: {
    backgroundColor: C.mutedLight,
  },

  // ── Period number column ──────────────────────────────────────

  colPeriod: {
    width: 28,

    alignItems: "center" as const,
    justifyContent: "center" as const,

    paddingVertical: 4,

    borderRightWidth: 0.5,
    borderRightColor: C.border,
    borderRightStyle: "solid" as const,
  },

  periodNumber: {
    fontSize: 7.5,
    fontFamily: F.bold,
    color: C.muted,
  },

  // ── Day columns ───────────────────────────────────────────────

  colDay: {
    flex: 1,

    paddingVertical: 4,
    paddingHorizontal: 3,

    borderRightWidth: 0.5,
    borderRightColor: C.border,
    borderRightStyle: "solid" as const,
  },

  thPeriod: {
    width: 28,

    textAlign: "center" as const,
    color: C.white,
    fontFamily: F.bold,
    fontSize: 7.5,

    paddingVertical: 2,
  },

  thDay: {
    flex: 1,

    color: C.white,
    fontFamily: F.bold,
    fontSize: 7.5,
    textAlign: "center" as const,

    paddingVertical: 2,
  },

  cellSubject: {
    fontFamily: F.bold,
    fontSize: 7.5,
    color: C.primary,
  },

  cellCode: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 1,
  },

  cellTeacher: {
    fontSize: 6.5,
    color: C.secondary,
    marginTop: 1,
  },

  cellTime: {
    fontSize: 6,
    color: C.muted,
    marginTop: 1,
  },

  cellEmpty: {
    fontSize: 7,
    color: C.border,
  },

  // ── Empty state ───────────────────────────────────────────────

  emptyState: {
    marginTop: 12,

    paddingVertical: 24,
    paddingHorizontal: 12,

    alignItems: "center" as const,

    backgroundColor: C.mutedLight,
    borderRadius: 4,
  },

  emptyStateText: {
    fontSize: 9,
    color: C.muted,
  },

  // ── Footer ───────────────────────────────────────────────────

  footer: {
    position: "absolute" as const,

    bottom: 20,
    left: PAD,
    right: PAD,

    flexDirection: "row" as const,
    justifyContent: "space-between",

    borderTopWidth: 0.5,
    borderTopColor: C.border,
    borderTopStyle: "solid" as const,

    paddingTop: 5,
  },

  footerText: {
    fontSize: 7,
    color: C.muted,
  },
});

// ── Helpers ───────────────────────────────────────────────────────

function safeSchoolInitial(schoolName: string): string {
  const trimmedName = schoolName.trim();

  if (!trimmedName) {
    return "S";
  }

  return trimmedName.charAt(0).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────

export function TimetablePDF({
  data,
}: {
  data: TimetablePdfData;
}): React.ReactElement<DocumentProps> {
  const periodMap = new Map<string, TimetablePeriodRow>();

  for (const period of data.periods) {
    periodMap.set(
      `${period.dayOfWeek}-${period.periodNumber}`,
      period,
    );
  }

  const maxPeriod = data.periods.reduce(
    (maximum, period) =>
      Math.max(maximum, period.periodNumber),
    8,
  );

  const activeDays = DAYS.filter((day) =>
    data.periods.some(
      (period) => period.dayOfWeek === day,
    ),
  );

  // Always show Monday to Friday when no periods exist.
  const displayDays =
    activeDays.length === 0
      ? DAYS.slice(0, 5)
      : activeDays;

  return (
    <Document
      title="Timetable"
      author={data.schoolName}
      subject={`${data.className} Section ${data.sectionName} timetable`}
      creator="School ERP"
    >
      <Page
        size="A4"
        orientation="landscape"
        style={s.page}
      >
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
                {data.className} — Section{" "}
                {data.sectionName}
                {data.academicYear
                  ? ` · ${data.academicYear}`
                  : ""}
              </Text>
            </View>
          </View>

          <View style={s.documentInformation}>
            <Text style={s.docTitle}>
              TIMETABLE
            </Text>

            <Text style={s.docSub}>
              Generated: {fmtPdfDate(data.generatedAt)}
            </Text>
          </View>
        </View>

        {/* ── Timetable grid ───────────────────────────────── */}
        {data.periods.length > 0 ? (
          <View style={s.grid}>
            {/* Header row */}
            <View style={s.gridHead} fixed>
              <Text style={s.thPeriod}>
                P#
              </Text>

              {displayDays.map((day) => (
                <Text
                  key={day}
                  style={s.thDay}
                >
                  {DAY_SHORT[day]}
                </Text>
              ))}
            </View>

            {/* Period rows */}
            {Array.from(
              {
                length: maxPeriod,
              },
              (_, index) => index + 1,
            ).map((periodNumber) => (
              <View
                key={periodNumber}
                wrap={false}
                style={[
                  s.gridRow,
                  periodNumber % 2 === 0
                    ? s.gridRowAlt
                    : {},
                ]}
              >
                <View style={s.colPeriod}>
                  <Text style={s.periodNumber}>
                    P{periodNumber}
                  </Text>
                </View>

                {displayDays.map((day) => {
                  const period = periodMap.get(
                    `${day}-${periodNumber}`,
                  );

                  return (
                    <View
                      key={day}
                      style={s.colDay}
                    >
                      {period?.subjectName ? (
                        <>
                          <Text style={s.cellSubject}>
                            {period.subjectName}
                          </Text>

                          {period.subjectCode && (
                            <Text style={s.cellCode}>
                              {period.subjectCode}
                            </Text>
                          )}

                          {period.teacherName && (
                            <Text style={s.cellTeacher}>
                              {period.teacherName}
                            </Text>
                          )}

                          {(period.startTime ||
                            period.endTime) && (
                            <Text style={s.cellTime}>
                              {period.startTime ?? ""}
                              {period.startTime &&
                              period.endTime
                                ? " – "
                                : ""}
                              {period.endTime ?? ""}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={s.cellEmpty}>
                          —
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyStateText}>
              No timetable periods are available for this
              section.
            </Text>
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.schoolName} · {data.className}-
            {data.sectionName}
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