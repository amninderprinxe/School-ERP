import { requireRole }           from "@/lib/session";
import { prisma }                from "@/lib/db";
import { notFound }              from "next/navigation";
import { ProfileShell }         from "@/components/student-profile/profile-shell";
import type { StudentProfileData } from "@/components/student-profile/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id }  = await params;
  const student = await prisma.user.findUnique({
    where: { id }, select: { name: true },
  });
  return { title: `${student?.name ?? "Student"} — Profile` };
}

export default async function StudentProfilePage({ params }: Props) {
  const actor    = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = actor.schoolId!;
  const { id }   = await params;

  // ── Main student fetch ────────────────────────────────────────
  const student = await prisma.user.findFirst({
    where: { id, schoolId, role: "STUDENT" },
    include: {
      studentProfile: {
        include: {
          section: {
            include: {
              class: { select: { id: true, name: true } },
            },
          },
          attendance: {
            orderBy: { date: "desc" },
            take:    365,
            select:  { date: true, status: true, remarks: true },
          },
          results: {
            include: {
              exam: {
                select: {
                  id: true, name: true,
                  examType: true, startDate: true,
                },
              },
              subject: { select: { id: true, name: true, code: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          feePayments: {
            include: {
              feeStructure: {
                select: {
                  id: true, amount: true,
                  academicYear: true, description: true,
                  feeCategory: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!student?.studentProfile) notFound();
  const sp = student.studentProfile;

  // ── Timetable ─────────────────────────────────────────────────
  const periods = sp.sectionId
    ? await prisma.period.findMany({
        where:   { sectionId: sp.sectionId, schoolId },
        include: {
          subject:        { select: { name: true, code: true } },
          teacherProfile: { include: { user: { select: { name: true } } } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
      })
    : [];

  const school = await prisma.school.findUnique({
    where:  { id: schoolId },
    select: { name: true },
  });

  // ── Serialize dates ───────────────────────────────────────────
  const data: StudentProfileData = {
    user: {
      id:        student.id,
      name:      student.name,
      email:     student.email ?? "",
      phone:     student.phone,
      gender:    student.gender,
      avatarUrl: student.avatarUrl,
      isActive:  student.isActive,
      createdAt: student.createdAt.toISOString(),
    },
    profile: {
      id:          sp.id,
      rollNumber:  sp.rollNumber,
      admissionNo: sp.admissionNo,
      dateOfBirth: sp.dateOfBirth?.toISOString() ?? null,
      bloodGroup:  sp.bloodGroup,
      address:     sp.address,
    },
    section: sp.section
      ? {
          id:    sp.section.id,
          name:  sp.section.name,
          class: { id: sp.section.class.id, name: sp.section.class.name },
        }
      : null,
    attendance: sp.attendance.map((a) => ({
      date:    a.date.toISOString(),
      status:  a.status,
      remarks: a.remarks,
    })),
    results: sp.results.map((r) => ({
      id:            r.id,
      marksObtained: r.marksObtained,
      maxMarks:      r.maxMarks,
      grade:         r.grade,
      createdAt:     r.createdAt.toISOString(),
      exam: {
        id:        r.exam.id,
        name:      r.exam.name,
        examType:  r.exam.examType,
        startDate: r.exam.startDate?.toISOString() ?? null,
      },
      subject: {
        id:   r.subject.id,
        name: r.subject.name,
        code: r.subject.code,
      },
    })),
    feePayments: sp.feePayments.map((p) => ({
      id:             p.id,
      status:         p.status,
      amountPaid:     p.amountPaid,
      waivedAmount:   p.waivedAmount,
      paymentDate:    p.paymentDate?.toISOString() ?? null,
      paymentMode:    p.paymentMode,
      transactionRef: p.transactionRef,
      remarks:        p.remarks,
      createdAt:      p.createdAt.toISOString(),
      feeStructure: {
        id:           p.feeStructure.id,
        amount:       p.feeStructure.amount,
        academicYear: p.feeStructure.academicYear,
        description:  p.feeStructure.description,
        feeCategory: {
          id:   p.feeStructure.feeCategory.id,
          name: p.feeStructure.feeCategory.name,
        },
      },
    })),
    periods: periods.map((p) => ({
      id:            p.id,
      dayOfWeek:     p.dayOfWeek,
      periodNumber:  p.periodNumber,
      startTime:     p.startTime,
      endTime:       p.endTime,
      subject:       p.subject
        ? { name: p.subject.name, code: p.subject.code }
        : null,
      teacherProfile: p.teacherProfile
        ? { user: { name: p.teacherProfile.user.name } }
        : null,
    })),
    school,
  };

  return <ProfileShell data={data} />;
}