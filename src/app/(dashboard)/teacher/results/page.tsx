// ── MARKS ENTRY for TEACHER ───────────────────────────────────────

import { requireRole } from "@/lib/session";
import { prisma }      from "@/lib/db";
import {
  ResultsEntryClient,
  type ExamOption,
  type SectionOption,
  type SubjectOption,
  type StudentResultRow,
} from "@/components/school-admin/results-entry-client";

export const metadata = { title: "Enter Results" };

interface Props {
  searchParams: Promise<{
    examId?:    string;
    sectionId?: string;
    subjectId?: string;

  }>;
}

export default async function TeacherResultsPage({ searchParams }: Props) {
  // ── TEACHER only ────────────────────────────────────────────────
  const user     = await requireRole(["TEACHER"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;
  const { examId, sectionId, subjectId } = sp;

  // ── Teacher profile + assigned subjects ──────────────────────
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: {
      subjects: {
        include: {
          subject: {
            include: {
              class: {
                include: {
                  sections: { where: { schoolId } },
                  exams:    { where: { schoolId }, orderBy: { createdAt: "desc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">
            Teacher profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  // ── Build de-duplicated exam list (from assigned subjects) ────
  const examMap     = new Map<string, ExamOption>();
  const sectionMap  = new Map<string, SectionOption>();
  const subjectMap  = new Map<string, SubjectOption>();

  for (const ts of teacherProfile.subjects) {
    const cls = ts.subject.class;

    // Subjects this teacher is assigned to
    subjectMap.set(ts.subject.id, {
      id:   ts.subject.id,
      name: ts.subject.name,
      code: ts.subject.code,
    });

    // Sections of the classes this teacher teaches in
    for (const sec of cls.sections) {
      sectionMap.set(sec.id, {
        id:    sec.id,
        name:  sec.name,
        class: { name: cls.name },
      });
    }

    // Exams for those classes
    for (const exam of cls.exams) {
      examMap.set(exam.id, {
        id:       exam.id,
        name:     exam.name,
        examType: exam.examType,
        classId:  exam.classId,
        class:    { id: cls.id, name: cls.name },
      });
    }
  }

  const exams:    ExamOption[]   = Array.from(examMap.values());
  const selectedExam = exams.find((e) => e.id === examId);

  // ── Filter sections/subjects to the selected exam's class ─────
  let filteredSections: SectionOption[] = [];
  let filteredSubjects: SubjectOption[] = [];

  if (selectedExam) {
    filteredSections = Array.from(sectionMap.values()).filter(
      // sectionMap has all sections; filter to exam's class
      (s) => {
        const match = teacherProfile.subjects.some(
          (ts) =>
            ts.subject.classId === selectedExam.classId &&
            ts.subject.class.sections.some((sec) => sec.id === s.id),
        );
        return match;
      },
    );

    filteredSubjects = Array.from(subjectMap.values()).filter(
      (sub) =>
        teacherProfile.subjects.some(
          (ts) =>
            ts.subject.id === sub.id &&
            ts.subject.classId === selectedExam.classId,
        ),
    );
  }

  // ── Validate URL selections ───────────────────────────────────
  const isValidSec  = !!sectionId && filteredSections.some((s) => s.id === sectionId);
  const isValidSub  = !!subjectId && filteredSubjects.some((s) => s.id === subjectId);
  const hasSelection = !!examId && !!selectedExam && isValidSec && isValidSub;

  // ── Load students + existing results when all selected ────────
  let students: StudentResultRow[] = [];

  if (hasSelection) {
    const studentProfiles = await prisma.studentProfile.findMany({
      where: {
        sectionId: sectionId!,
        user:      { schoolId, isActive: true },
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ rollNumber: "asc" }, { user: { name: "asc" } }],
    });

    const spIds = studentProfiles.map((sp) => sp.id);

    const existingResults =
      spIds.length > 0
        ? await prisma.result.findMany({
            where: {
              examId:           examId!,
              subjectId:        subjectId!,
              studentProfileId: { in: spIds },
              schoolId,
            },
            select: {
              studentProfileId: true,
              marksObtained:    true,
              maxMarks:         true,
              grade:            true,
              remarks:          true,
            },
          })
        : [];

    const existingMap = new Map(
      existingResults.map((r) => [r.studentProfileId, r]),
    );

    students = studentProfiles.map((sp) => {
      const ex = existingMap.get(sp.id);
      return {
        id:                    sp.id,
        name:                  sp.user.name,
        rollNumber:            sp.rollNumber,
        admissionNo:           sp.admissionNo,
        existingMarksObtained: ex?.marksObtained ?? null,
        existingMaxMarks:      ex?.maxMarks       ?? null,
        existingGrade:         ex?.grade          ?? null,
        existingRemarks:       ex?.remarks        ?? null,
      };
    });
  }

  return (
    <ResultsEntryClient
      key={`${examId ?? "x"}-${sectionId ?? "x"}-${subjectId ?? "x"}`}
      exams={exams}
      sections={filteredSections}
      subjects={filteredSubjects}
      students={students}
      selectedExamId={hasSelection || (examId && selectedExam) ? examId! : ""}
      selectedSectionId={isValidSec ? sectionId! : ""}
      selectedSubjectId={isValidSub ? subjectId! : ""}
      hasSelection={hasSelection}
      basePath="/teacher/results"

    />
  );
}
