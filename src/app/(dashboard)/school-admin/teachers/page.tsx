import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const metadata = {
  title: "Teachers | School ERP",
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
      // gender: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
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

      {/* Teachers list */}
      {teachers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Gender
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Emp. Code
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Qualification
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {teachers.map((teacher) => {
                  const teacherName = teacher.user.name?.trim() || "Teacher";

                  const initials = getInitials(teacherName);

                  return (
                    <tr
                      key={teacher.id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-600">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {teacherName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">
                          {teacher.user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {/* {formatGender(teacher.gender)} */}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-sm text-gray-600">
                          {teacher.employeeCode || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">
                          {teacher.qualification?.trim() || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            teacher.user.isActive
                              ? "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                              : "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                          }
                        >
                          {teacher.user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/school-admin/teachers/${teacher.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>

                          <form action={deleteTeacher}>
                            <input
                              type="hidden"
                              name="teacherProfileId"
                              value={teacher.id}
                            />

                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatGender(gender: string | null) {
  if (!gender) {
    return "Not specified";
  }

  return gender
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
