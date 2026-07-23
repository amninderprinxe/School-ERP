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
  fmtPct,
  fmtNum,
} from "./tokens";

// ── Data types ────────────────────────────────────────────────────

export interface RCSubject {
  subjectName: string;
  subjectCode: string | null;
  marksObtained: number;
  maxMarks: number;
  grade: string | null;
}

export interface RCExam {
  examName: string;
  examType: string;
  className: string;
  startDate: Date | null;
  endDate: Date | null;
  results: RCSubject[];
}

export interface ReportCardData {
  schoolName: string;
  schoolLogo: string | null;

  studentName: string;
  rollNumber: string | null;
  admissionNo: string | null;
  className: string | null;
  sectionName: string | null;
  academicYear: string | null;

  exams: RCExam[];
  generatedAt: Date;
}

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
    paddingRight: 14,
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

  // ── Exam section ─────────────────────────────────────────────

  examSection: {
    marginBottom: 8,
  },

  examHeader: {
    backgroundColor: C.primary,

    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center" as const,

    padding: 7,
    marginTop: 10,
    borderRadius: 3,
  },

  examName: {
    fontFamily: F.bold,
    fontSize: 10,
    color: C.white,
  },

  examDates: {
    fontSize: 8,
    color: C.primaryLight,
    textAlign: "right" as const,
  },

  // ── Table ────────────────────────────────────────────────────

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

    minHeight: 24,
  },

  tableRowAlt: {
    backgroundColor: C.mutedLight,
  },

  tableFooter: {
    flexDirection: "row" as const,

    paddingVertical: 5,
    paddingHorizontal: 6,

    backgroundColor: C.primaryLight,

    borderTopWidth: 1,
    borderTopColor: C.primary,
    borderTopStyle: "solid" as const,
  },

  thCell: {
    fontFamily: F.bold,
    fontSize: 8,
    color: C.primary,
  },

  tdCell: {
    fontSize: 8,
    color: C.black,
  },

  tfCell: {
    fontFamily: F.bold,
    fontSize: 8,
    color: C.primary,
  },

  colSubject: {
    flex: 1,
    paddingRight: 4,
  },

  colCode: {
    width: 55,
  },

  colMax: {
    width: 45,
    textAlign: "center" as const,
  },

  colObt: {
    width: 55,
    textAlign: "center" as const,
  },

  colPct: {
    width: 48,
    textAlign: "center" as const,
  },

  colGrade: {
    width: 42,
    textAlign: "center" as const,
  },

  emptyExamRows: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center" as const,

    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid" as const,
  },

  emptyExamRowsText: {
    fontSize: 8,
    color: C.muted,
  },

  // ── Overall summary ──────────────────────────────────────────

  summary: {
    marginTop: 14,

    flexDirection: "row" as const,
    justifyContent: "space-between",

    backgroundColor: C.mutedLight,
    padding: 10,
    borderRadius: 4,
  },

  summaryItem: {
    alignItems: "center" as const,
    flex: 1,
  },

  summaryVal: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.primary,
  },

  summaryLabel: {
    fontSize: 7,
    color: C.muted,
    marginTop: 2,
  },

  // ── No results ───────────────────────────────────────────────

  emptyState: {
    marginTop: 10,

    paddingVertical: 28,
    paddingHorizontal: 12,

    alignItems: "center" as const,

    backgroundColor: C.mutedLight,
    borderRadius: 4,
  },

  emptyStateTitle: {
    fontFamily: F.bold,
    fontSize: 10,
    color: C.secondary,
  },

  emptyStateText: {
    fontSize: 8,
    color: C.muted,
    marginTop: 4,
    textAlign: "center" as const,
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

function gradeColor(grade: string | null): string {
  if (!grade) {
    return C.muted;
  }

  if (["A+", "A"].includes(grade)) {
    return C.green;
  }

  if (grade === "F") {
    return C.red;
  }

  return C.black;
}

function safeSchoolInitial(schoolName: string): string {
  const trimmedSchoolName = schoolName.trim();

  if (!trimmedSchoolName) {
    return "S";
  }

  return trimmedSchoolName.charAt(0).toUpperCase();
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

// ── Component ─────────────────────────────────────────────────────

export function ReportCardPDF({
  data,
}: {
  data: ReportCardData;
}): React.ReactElement<DocumentProps> {
  const totalObtained = data.exams.reduce(
    (examSum, exam) =>
      examSum +
      exam.results.reduce(
        (subjectSum, result) =>
          subjectSum +
          safeNumber(result.marksObtained),
        0,
      ),
    0,
  );

  const totalMax = data.exams.reduce(
    (examSum, exam) =>
      examSum +
      exam.results.reduce(
        (subjectSum, result) =>
          subjectSum +
          safeNumber(result.maxMarks),
        0,
      ),
    0,
  );

  const overallPercentage =
    fmtPct(totalObtained, totalMax);

  const examCount = data.exams.length;

  const subjectCount = data.exams.reduce(
    (sum, exam) => sum + exam.results.length,
    0,
  );

  return (
    <Document
      title="Report Card"
      author={data.schoolName}
      subject={`${data.studentName} report card`}
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
                Student Report Card
              </Text>
            </View>
          </View>

          <View style={s.documentInformation}>
            <Text style={s.docTitle}>
              REPORT CARD
            </Text>

            {data.academicYear && (
              <Text style={s.docSub}>
                Academic Year: {data.academicYear}
              </Text>
            )}

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

        {/* ── Exam results ──────────────────────────────────── */}
        {data.exams.length > 0 ? (
          data.exams.map((exam, examIndex) => {
            const examTotal = exam.results.reduce(
              (sum, result) =>
                sum +
                safeNumber(result.marksObtained),
              0,
            );

            const examMaximum = exam.results.reduce(
              (sum, result) =>
                sum +
                safeNumber(result.maxMarks),
              0,
            );

            const examPercentage =
              fmtPct(examTotal, examMaximum);

            return (
              <View
                key={`${exam.examName}-${examIndex}`}
                style={s.examSection}
              >
                {/* Exam heading */}
                <View
                  style={s.examHeader}
                  wrap={false}
                >
                  <Text style={s.examName}>
                    {exam.examName}
                  </Text>

                  <Text style={s.examDates}>
                    {exam.className}

                    {exam.startDate || exam.endDate
                      ? ` · ${fmtPdfDate(
                          exam.startDate,
                        )} – ${fmtPdfDate(
                          exam.endDate,
                        )}`
                      : ""}
                  </Text>
                </View>

                {/* Table header */}
                <View style={s.tableHead} wrap={false}>
                  <Text
                    style={[
                      s.thCell,
                      s.colSubject,
                    ]}
                  >
                    Subject
                  </Text>

                  <Text
                    style={[
                      s.thCell,
                      s.colCode,
                    ]}
                  >
                    Code
                  </Text>

                  <Text
                    style={[
                      s.thCell,
                      s.colMax,
                    ]}
                  >
                    Max
                  </Text>

                  <Text
                    style={[
                      s.thCell,
                      s.colObt,
                    ]}
                  >
                    Obtained
                  </Text>

                  <Text
                    style={[
                      s.thCell,
                      s.colPct,
                    ]}
                  >
                    %
                  </Text>

                  <Text
                    style={[
                      s.thCell,
                      s.colGrade,
                    ]}
                  >
                    Grade
                  </Text>
                </View>

                {/* Subject rows */}
                {exam.results.length > 0 ? (
                  exam.results.map(
                    (result, resultIndex) => (
                      <View
                        key={`${result.subjectName}-${resultIndex}`}
                        wrap={false}
                        style={[
                          s.tableRow,
                          resultIndex % 2 !== 0
                            ? s.tableRowAlt
                            : {},
                        ]}
                      >
                        <Text
                          style={[
                            s.tdCell,
                            s.colSubject,
                          ]}
                        >
                          {result.subjectName}
                        </Text>

                        <Text
                          style={[
                            s.tdCell,
                            s.colCode,
                          ]}
                        >
                          {result.subjectCode ?? "—"}
                        </Text>

                        <Text
                          style={[
                            s.tdCell,
                            s.colMax,
                          ]}
                        >
                          {fmtNum(result.maxMarks)}
                        </Text>

                        <Text
                          style={[
                            s.tdCell,
                            s.colObt,
                          ]}
                        >
                          {fmtNum(
                            result.marksObtained,
                          )}
                        </Text>

                        <Text
                          style={[
                            s.tdCell,
                            s.colPct,
                          ]}
                        >
                          {fmtPct(
                            result.marksObtained,
                            result.maxMarks,
                          )}
                        </Text>

                        <Text
                          style={[
                            s.tdCell,
                            s.colGrade,
                            {
                              color: gradeColor(
                                result.grade,
                              ),
                              fontFamily: F.bold,
                            },
                          ]}
                        >
                          {result.grade ?? "—"}
                        </Text>
                      </View>
                    ),
                  )
                ) : (
                  <View style={s.emptyExamRows}>
                    <Text style={s.emptyExamRowsText}>
                      No subject results found for this
                      exam.
                    </Text>
                  </View>
                )}

                {/* Exam total */}
                {exam.results.length > 0 && (
                  <View
                    style={s.tableFooter}
                    wrap={false}
                  >
                    <Text
                      style={[
                        s.tfCell,
                        s.colSubject,
                      ]}
                    >
                      TOTAL
                    </Text>

                    <Text
                      style={[
                        s.tfCell,
                        s.colCode,
                      ]}
                    />

                    <Text
                      style={[
                        s.tfCell,
                        s.colMax,
                      ]}
                    >
                      {fmtNum(examMaximum)}
                    </Text>

                    <Text
                      style={[
                        s.tfCell,
                        s.colObt,
                      ]}
                    >
                      {fmtNum(examTotal)}
                    </Text>

                    <Text
                      style={[
                        s.tfCell,
                        s.colPct,
                      ]}
                    >
                      {examPercentage}
                    </Text>

                    <Text
                      style={[
                        s.tfCell,
                        s.colGrade,
                      ]}
                    />
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={s.emptyState} wrap={false}>
            <Text style={s.emptyStateTitle}>
              No results available
            </Text>

            <Text style={s.emptyStateText}>
              No exam results have been recorded for this
              student yet.
            </Text>
          </View>
        )}

        {/* ── Overall summary ───────────────────────────────── */}
        {data.exams.length > 0 && (
          <View style={s.summary} wrap={false}>
            {[
              {
                label: "Exams Taken",
                value: String(examCount),
              },
              {
                label: "Total Subjects",
                value: String(subjectCount),
              },
              {
                label: "Total Marks",
                value: `${fmtNum(
                  totalObtained,
                )} / ${fmtNum(totalMax)}`,
              },
              {
                label: "Overall %",
                value: overallPercentage,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={s.summaryItem}
              >
                <Text style={s.summaryVal}>
                  {item.value}
                </Text>

                <Text style={s.summaryLabel}>
                  {item.label}
                </Text>
              </View>
            ))}
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
            {data.schoolName} · {data.studentName}
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