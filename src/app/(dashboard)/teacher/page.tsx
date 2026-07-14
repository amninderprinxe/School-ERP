import { redirect } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  GraduationCap,
  Megaphone,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const metadata = {
  title: "Teacher — Dashboard",
};

export default async function TeacherDashboard() {
  const currentUser = await requireRole(["TEACHER"]);

  /*
   * Fetch the latest user data directly from the database.
   * Session/JWT schoolId stale ho sakdi aa, is karke database value use karange.
   */
  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      schoolId: true,

      teacherProfile: {
        select: {
          id: true,
          employeeCode: true,
          qualification: true,

          subjects: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  classId: true,

                  class: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },

          classTeacherOf: {
            select: {
              id: true,
              name: true,

              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.teacherProfile) {
    throw new Error("Teacher profile was not found.");
  }

  if (!user.schoolId) {
    throw new Error(
      `Teacher account ${user.email} is not linked to a school.`,
    );
  }

  const teacherProfile = user.teacherProfile;
  const schoolId = user.schoolId;

  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
    },
  });

  const subjectCount = teacherProfile.subjects.length;
  const sectionCount = teacherProfile.classTeacherOf.length;

  const distinctClasses = new Set(
    teacherProfile.subjects.map(({ subject }) => subject.classId),
  ).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.name?.split(" ")[0] ?? "Teacher"} 👋
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {teacherProfile.employeeCode
            ? `Employee Code: ${teacherProfile.employeeCode}`
            : "Teacher Dashboard"}

          {teacherProfile.qualification
            ? ` · ${teacherProfile.qualification}`
            : ""}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="My Subjects"
          value={subjectCount}
          description="Assigned to you"
          icon={BookMarked}
          color="blue"
        />

        <StatCard
          title="Classes Taught"
          value={distinctClasses}
          description="Distinct grade levels"
          icon={BookOpen}
          color="purple"
        />

        <StatCard
          title="Class Teacher Of"
          value={sectionCount === 0 ? "—" : sectionCount}
          description={sectionCount === 0 ? "Not assigned yet" : "Section(s)"}
          icon={GraduationCap}
          color="green"
        />
      </div>

      {/* My Subjects */}
      {subjectCount > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              My Subjects
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Subjects assigned to you
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {teacherProfile.subjects.map(({ subject }) => (
              <div
                key={subject.id}
                className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-gray-50/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <BookMarked className="h-4 w-4 text-blue-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {subject.name}
                    </p>

                    {subject.code ? (
                      <p className="text-xs text-gray-400">{subject.code}</p>
                    ) : null}
                  </div>
                </div>

                <span className="ml-3 shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  {subject.class.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <BookMarked className="mx-auto h-8 w-8 text-gray-300" />

          <h2 className="mt-3 text-sm font-semibold text-gray-900">
            No subjects assigned
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your assigned subjects will appear here.
          </p>
        </div>
      )}

      {/* Class Teacher Sections */}
      {sectionCount > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Class Teacher — My Sections
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Sections assigned to you as class teacher
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {teacherProfile.classTeacherOf.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>

                  <p className="truncate text-sm font-medium text-gray-900">
                    {section.class.name} — Section {section.name}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Class Teacher
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Announcements */}
      {announcements.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              School Announcements
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Latest updates from your school
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    <Megaphone className="h-3.5 w-3.5 text-indigo-500" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {announcement.title}
                    </p>

                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {announcement.content}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {announcement.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-gray-300" />

          <h2 className="mt-3 text-sm font-semibold text-gray-900">
            No announcements
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            New school announcements will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
