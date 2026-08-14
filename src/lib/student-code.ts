import { prisma } from "@/lib/db";

export async function generateStudentCode(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { code: true },
  });

  if (!school?.code) {
    throw new Error("School code is missing");
  }

  // Count existing students in this school
  const count = await prisma.studentProfile.count({
    where: { user: { schoolId } },
  });

  const nextNum = String(count + 1).padStart(4, "0"); // Converts 1 -> 0001
  return `${school.code.toUpperCase()}-${nextNum}`;   // e.g., KRD-0001
}