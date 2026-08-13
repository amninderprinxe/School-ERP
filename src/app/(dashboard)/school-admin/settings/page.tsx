import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { SchoolSettingsClient } from "@/components/settings/school/school-settings-client";

export const metadata: Metadata = {
  title: "School Settings — CampusX",
  description: "Manage school profile, academic schedules, fees, and system preferences.",
};

export default async function SchoolSettingsPage() {
  const user = await requireRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]);

  let schoolId = user.schoolId;
  if (!schoolId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    });
    schoolId = dbUser?.schoolId ?? null;
  }

  if (!schoolId) {
    notFound();
  }

  const rawSchool = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      tagline: true,
      foundedYear: true,
      principalName: true,
      timezone: true,
      workingDays: true,
      periodsPerDay: true,
      periodDurationMin: true,
      attendanceMinPct: true,
      receiptPrefix: true,
      lateFeePercent: true,
      emailNotifications: true,
      smsNotifications: true,
      showRankInResult: true,
      maxAbsenceAlert: true,
      logo: true,
      logoUrl: true,
      status: true,
      primaryColor: true,
    },
  });

  if (!rawSchool) {
    notFound();
  }

  // Ensure 'logo' property aligns properly if the client schema expects it alongside logoUrl
  const school = {
    ...rawSchool,
    logo: rawSchool.logo ?? rawSchool.logoUrl ?? null,
  };

  return (
    <SchoolSettingsClient
      school={school}
      userRole={user.role as Role}
    />
  );
}