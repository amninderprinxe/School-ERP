import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus, UserRound, Users } from "lucide-react";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { TeacherTableClient } from "@/components/teacher/teacher-table-client";

export const metadata = {
  title: "Teachers | Campus-X",
};

export default async function TeachersPage() {
  const sessionUser = await requireRole(["SCHOOL_ADMIN"]);

  /*
   * Session/JWT da schoolId stale ho sakda hai.
   * Is karke school admin da latest schoolId database ton fetch kita ja reha hai.
   */
  const schoolAdmin = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      email: true,
      schoolId: true,
    },
  });

  if (!schoolAdmin) {
    throw new Error("School administrator account was not found.");
  }

  if (!schoolAdmin.schoolId) {
    throw new Error("School administrator is not linked to a school.");
  }

  const schoolId = schoolAdmin.schoolId;

  /*
   * Only fetch teachers whose User.schoolId matches
   * the currently logged-in school admin's schoolId.
   */
  const teachers = await prisma.teacherProfile.findMany({
    where: {
      user: {
        schoolId,
        role: "TEACHER",
      },
    },
    select: {
      id: true,
      userId: true,
      employeeCode: true,
      qualification: true,
      gender: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          isActive: true,
          schoolId: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  async function deleteTeacher(formData: FormData) {
    "use server";

    const currentSessionUser = await requireRole(["SCHOOL_ADMIN"]);

    /*
     * Again fetch latest schoolId from DB.
     * Never trust a teacher ID directly from the form.
     */
    const currentSchoolAdmin = await prisma.user.findUnique({
      where: {
        id: currentSessionUser.id,
      },
      select: {
        schoolId: true,
      },
    });

    if (!currentSchoolAdmin?.schoolId) {
      throw new Error("School administrator is not linked to a school.");
    }

    const teacherProfileId = formData.get("teacherProfileId");

    if (
      typeof teacherProfileId !== "string" ||
      teacherProfileId.trim().length === 0
    ) {
      throw new Error("Invalid teacher ID.");
    }

    /*
     * This ownership check prevents one school admin from
     * deleting another school's teacher.
     */
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        id: teacherProfileId,
        user: {
          schoolId: currentSchoolAdmin.schoolId,
          role: "TEACHER",
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found in your school.");
    }

    /*
     * Delete the User record.
     * TeacherProfile and related records should follow the
     * onDelete rules defined in schema.prisma.
     */
    await prisma.user.delete({
      where: {
        id: teacher.userId,
      },
    });

    revalidatePath("/school-admin/teachers");
    revalidatePath("/school-admin/sections");
    revalidatePath("/school-admin");
  }

  const clientTeachers = teachers.map((t) => ({
    id: t.id,
    userId: t.userId,
    name: t.user.name ?? "Teacher",
    email: t.user.email,
    gender: (t as any).gender ?? t.user.gender ?? null,
    employeeCode: t.employeeCode,
    qualification: t.qualification,
    isActive: t.user.isActive,
  }));

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>

          <p className="mt-1 text-sm text-gray-500">
            {teachers.length} {teachers.length === 1 ? "teacher" : "teachers"}
          </p>
        </div>

        <Link
          href="/school-admin/teachers/new"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </Link>
      </div>

      {/* Teachers client table with live search & filters */}
      {teachers.length > 0 ? (
        <TeacherTableClient
          teachers={clientTeachers}
          deleteAction={deleteTeacher}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Users className="h-6 w-6 text-blue-600" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-gray-900">
            No teachers found
          </h2>

          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Add the first teacher for your school. Teachers belonging to other
            schools will not appear here.
          </p>

          <Link
            href="/school-admin/teachers/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <UserRound className="h-4 w-4" />
            Add Teacher
          </Link>
        </div>
      )}
    </div>
  );
}