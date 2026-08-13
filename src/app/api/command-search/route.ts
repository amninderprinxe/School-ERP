import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma }                    from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q       = searchParams.get("q")?.trim() ?? "";
  const role    = session.user.role;
  const userId  = session.user.id;
  const schoolId = session.user.schoolId ?? "";

  if (!q || q.length < 1) {
    return NextResponse.json({ groups: [] });
  }

  const contains = { contains: q, mode: "insensitive" as const };
  const groups: {
    id:    string;
    label: string;
    items: {
      id:       string;
      title:    string;
      subtitle?: string;
      href:     string;
      type:     string;
    }[];
  }[] = [];

  try {
    if (role === "SCHOOL_ADMIN" && schoolId) {
      const [students, teachers, classes, subjects, exams, announcements] =
        await Promise.all([

          // Students
          prisma.user.findMany({
            where: {
              schoolId,
              role:     "STUDENT",
              isActive: true,
              OR: [
                { name:  contains },
                { email: contains },
                { studentProfile: { rollNumber:  contains } },
                { studentProfile: { admissionNo: contains } },
              ],
            },
            include: {
              studentProfile: {
                include: { section: { include: { class: true } } },
              },
            },
            take: 6,
          }),

          // Teachers
          prisma.user.findMany({
            where: {
              schoolId,
              role:     "TEACHER",
              isActive: true,
              OR: [
                { name:  contains },
                { email: contains },
                { teacherProfile: { employeeCode: contains } },
              ],
            },
            include: { teacherProfile: true },
            take: 5,
          }),

          // Classes
          prisma.class.findMany({
            where: { schoolId, name: contains },
            include: { _count: { select: { sections: true } } },
            take: 5,
          }),

          // Subjects
          prisma.subject.findMany({
            where: {
              schoolId,
              OR: [{ name: contains }, { code: contains }],
            },
            include: { class: { select: { name: true } } },
            take: 5,
          }),

          // Exams
          prisma.exam.findMany({
            where: {
              schoolId,
              name: contains,
            },
            include: { class: { select: { name: true } } },
            take: 5,
          }),

          // Announcements
          prisma.announcement.findMany({
            where: { schoolId, title: contains },
            take: 4,
          }),
        ]);

      if (students.length > 0) {
        groups.push({
          id:    "students",
          label: "Students",
          items: students.map((u) => ({
            id:       u.id,
            title:    u.name,
            subtitle: u.studentProfile?.section
              ? `${u.studentProfile.section.class.name} — Section ${u.studentProfile.section.name}${u.studentProfile.rollNumber ? ` · Roll ${u.studentProfile.rollNumber}` : ""}`
              : u.email,
            href: "/school-admin/students",
            type: "student",
          })),
        });
      }

      if (teachers.length > 0) {
        groups.push({
          id:    "teachers",
          label: "Teachers",
          items: teachers.map((u) => ({
            id:       u.id,
            title:    u.name,
            subtitle: u.teacherProfile?.employeeCode
              ? `ID: ${u.teacherProfile.employeeCode} · ${u.email}`
              : u.email,
            href: "/school-admin/teachers",
            type: "teacher",
          })),
        });
      }

      if (classes.length > 0) {
        groups.push({
          id:    "classes",
          label: "Classes",
          items: classes.map((c) => ({
            id:       c.id,
            title:    c.name,
            subtitle: `${c._count.sections} section${c._count.sections !== 1 ? "s" : ""}`,
            href:     "/school-admin/classes",
            type:     "class",
          })),
        });
      }

      if (subjects.length > 0) {
        groups.push({
          id:    "subjects",
          label: "Subjects",
          items: subjects.map((s) => ({
            id:       s.id,
            title:    s.name,
            subtitle: `${s.class.name}${s.code ? ` · Code: ${s.code}` : ""}`,
            href:     "/school-admin/subjects",
            type:     "subject",
          })),
        });
      }

      if (exams.length > 0) {
        groups.push({
          id:    "exams",
          label: "Exams",
          items: exams.map((e) => ({
            id:       e.id,
            title:    e.name,
            subtitle: `${e.class.name} · ${e.examType.replace(/_/g, " ")}`,
            href:     `/school-admin/exams/${e.id}/edit`,
            type:     "exam",
          })),
        });
      }

      if (announcements.length > 0) {
        groups.push({
          id:    "announcements",
          label: "Announcements",
          items: announcements.map((a) => ({
            id:       a.id,
            title:    a.title,
            subtitle: a.content.slice(0, 60) + (a.content.length > 60 ? "…" : ""),
            href:     "/school-admin/announcements",
            type:     "announcement",
          })),
        });
      }

    } else if (role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId },
      });

      if (tp) {
        const [students, subjects] = await Promise.all([
          // Students in teacher's sections
          prisma.studentProfile.findMany({
            where: {
              section: {
                periods: { some: { teacherProfileId: tp.id } },
              },
              user: {
                isActive: true,
                OR: [{ name: contains }, { email: contains }],
              },
            },
            include: {
              user:    { select: { name: true, email: true } },
              section: { include: { class: true } },
            },
            take: 6,
          }),

          // Teacher's subjects
          prisma.teacherSubject.findMany({
            where: {
              teacherProfileId: tp.id,
              subject: { OR: [{ name: contains }, { code: contains }] },
            },
            include: {
              subject: { include: { class: { select: { name: true } } } },
            },
            take: 5,
          }),
        ]);

        if (students.length > 0) {
          groups.push({
            id:    "students",
            label: "My Students",
            items: students.map((sp) => ({
              id:       sp.id,
              title:    sp.user.name,
              subtitle: sp.section
                ? `${sp.section.class.name} — Section ${sp.section.name}`
                : sp.user.email,
              href: "/teacher/students",
              type: "student",
            })),
          });
        }

        if (subjects.length > 0) {
          groups.push({
            id:    "subjects",
            label: "My Subjects",
            items: subjects.map((ts) => ({
              id:       ts.id,
              title:    ts.subject.name,
              subtitle: ts.subject.class.name,
              href:     "/teacher/subjects",
              type:     "subject",
            })),
          });
        }
      }

    } else if (role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({
        where:   { userId },
        include: {
          section: { include: { class: true } },
          user:    { select: { schoolId: true } },
        },
      });

      if (sp?.section) {
        const exams = await prisma.exam.findMany({
          where: {
            classId:  sp.section.classId,
            schoolId: sp.user?.schoolId ?? schoolId,
            name:     contains,
          },
          take: 5,
        });

        if (exams.length > 0) {
          groups.push({
            id:    "exams",
            label: "Exams",
            items: exams.map((e) => ({
              id:       e.id,
              title:    e.name,
              subtitle: e.examType.replace(/_/g, " "),
              href:     "/student/results",
              type:     "exam",
            })),
          });
        }
      }

    }

    return NextResponse.json({ groups });
  } catch (e) {
    console.error("[command-search]", e);
    return NextResponse.json({ groups: [] });
  }
}