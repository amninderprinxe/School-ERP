import { requireRole }              from "@/lib/session";
import { prisma }                   from "@/lib/db";
import {
  AttendanceMarkingClient,
  type StudentRow,
  type SectionOption,
} from "@/components/teacher/attendance-marking-client";

export const metadata = { title: "Mark Attendance" };

interface Props {
  searchParams: Promise<{ sectionId?: string; date?: string }>;
}

export default async function TeacherAttendancePage({ searchParams }: Props) {
  const user      = await requireRole(["TEACHER"]);
  const schoolId  = user.schoolId!;
  const { sectionId, date } = await searchParams;

  // ── 1. Load teacher profile + accessible sections ─────────────
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where:   { userId: user.id },
    include: {
      // Sections where this teacher is the class teacher
      classTeacherOf: {
        where:   { schoolId },
        include: { class: true },
      },
      // Subjects (→ class → sections) where teacher teaches
      subjects: {
        include: {
          subject: {
            include: {
              class: {
                include: {
                  sections: { where: { schoolId } },
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

  // ── 2. Build de-duplicated section list ───────────────────────
  const sectionMap = new Map<string, SectionOption>();

  // From class-teacher assignments
  for (const sec of teacherProfile.classTeacherOf) {
    sectionMap.set(sec.id, {
      id:    sec.id,
      name:  sec.name,
      class: { name: sec.class.name },
    });
  }

  // From subjects taught (all sections of the same class)
  for (const ts of teacherProfile.subjects) {
    for (const sec of ts.subject.class.sections) {
      if (!sectionMap.has(sec.id)) {
        sectionMap.set(sec.id, {
          id:    sec.id,
          name:  sec.name,
          class: { name: ts.subject.class.name },
        });
      }
    }
  }

  const sections: SectionOption[] = Array.from(sectionMap.values()).sort(
    (a, b) =>
      `${a.class.name}-${a.name}`.localeCompare(`${b.class.name}-${b.name}`),
  );

  // ── 3. Validate URL params ────────────────────────────────────
  const today        = new Date().toISOString().split("T")[0];
  const isValidDate  = !!date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date <= today;                    // cannot mark future dates
  const isValidSec   = !!sectionId && sections.some((s) => s.id === sectionId);
  const hasSelection = isValidSec && isValidDate;

  // ── 4. Load students + existing attendance ────────────────────
  let students: StudentRow[] = [];

  if (hasSelection) {
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);

    const [studentProfiles, existingRecords] = await Promise.all([
      prisma.studentProfile.findMany({
        where: {
          sectionId: sectionId!,
          user:      { schoolId, isActive: true },
        },
        include: { user: { select: { name: true } } },
        orderBy: [{ rollNumber: "asc" }, { user: { name: "asc" } }],
      }),
      prisma.attendance.findMany({
        where: {
          sectionId: sectionId!,
          date:      attendanceDate,
          schoolId,
        },
        select: {
          id:               true,
          studentProfileId: true,
          status:           true,
          remarks:          true,
        },
      }),
    ]);

    // Map existing records by studentProfileId for O(1) lookup
    const existingMap = new Map(
      existingRecords.map((r) => [r.studentProfileId, r]),
    );

    students = studentProfiles.map((sp) => {
      const ex = existingMap.get(sp.id);
      return {
        id:                   sp.id,
        name:                 sp.user.name,
        rollNumber:           sp.rollNumber,
        admissionNo:          sp.admissionNo,
        existingStatus:       ex?.status        ?? null,
        existingRemarks:      ex?.remarks        ?? null,
        existingAttendanceId: ex?.id             ?? null,
      };
    });
  }

  return (
    <AttendanceMarkingClient
      // key forces full remount when section or date changes,
      // ensuring status state resets cleanly from new props
      key={`${sectionId ?? "none"}-${date ?? "none"}`}
      sections={sections}
      students={students}
      selectedSectionId={isValidSec  ? sectionId! : ""}
      selectedDate={isValidDate ? date!     : today}
      hasSelection={hasSelection}
    />
  );
}
