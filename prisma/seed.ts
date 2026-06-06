import { PrismaClient, Role, Gender, SchoolStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database…\n");

  const DEFAULT_PASSWORD = "Password@123";
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ── 1. SUPER ADMIN (no school) ───────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where:  { email: "superadmin@erp.com" },
    update: { name: "Super Admin", role: Role.SUPER_ADMIN, isActive: true },
    create: {
      name:     "Super Admin",
      email:    "superadmin@erp.com",
      password: hashed,
      role:     Role.SUPER_ADMIN,
      gender:   Gender.MALE,
      isActive: true,
    },
  });
  console.log(`✅  Super Admin    → ${superAdmin.email}`);

  // ── 2. SCHOOL (tenant) ───────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where:  { slug: "greenwood-high" },
    update: {
      name:   "Greenwood High School",
      status: SchoolStatus.ACTIVE,
    },
    create: {
      name:    "Greenwood High School",
      slug:    "greenwood-high",
      address: "123 Main Street, Springfield",
      phone:   "+91-9876543210",
      email:   "info@greenwood.edu",
      status:  SchoolStatus.ACTIVE,
    },
  });
  console.log(`✅  School         → ${school.name}  (slug: ${school.slug})`);

  // ── 3. SCHOOL ADMIN ──────────────────────────────────────────────────────
  const schoolAdmin = await prisma.user.upsert({
    where:  { email: "admin@greenwood.edu" },
    update: { name: "School Admin", schoolId: school.id, isActive: true },
    create: {
      name:     "School Admin",
      email:    "admin@greenwood.edu",
      password: hashed,
      role:     Role.SCHOOL_ADMIN,
      gender:   Gender.FEMALE,
      isActive: true,
      schoolId: school.id,
    },
  });
  console.log(`✅  School Admin   → ${schoolAdmin.email}`);

  // ── 4. CLASS ─────────────────────────────────────────────────────────────
  const grade10 = await prisma.class.upsert({
    where:  { schoolId_name: { schoolId: school.id, name: "Grade 10" } },
    update: {},
    create: { name: "Grade 10", schoolId: school.id },
  });
  console.log(`✅  Class          → ${grade10.name}`);

  // ── 5. TEACHER user ──────────────────────────────────────────────────────
  const teacherUser = await prisma.user.upsert({
    where:  { email: "teacher@greenwood.edu" },
    update: { name: "Ravi Sharma", schoolId: school.id, isActive: true },
    create: {
      name:     "Ravi Sharma",
      email:    "teacher@greenwood.edu",
      password: hashed,
      role:     Role.TEACHER,
      gender:   Gender.MALE,
      isActive: true,
      schoolId: school.id,
    },
  });

  // 5a. TEACHER profile (separate upsert — avoids nested-create conflict on re-seed)
  const teacherProfile = await prisma.teacherProfile.upsert({
    where:  { userId: teacherUser.id },
    update: {
      employeeCode:  "TCH-001",
      qualification: "M.Sc Mathematics",
    },
    create: {
      userId:        teacherUser.id,
      employeeCode:  "TCH-001",
      qualification: "M.Sc Mathematics",
      joiningDate:   new Date("2020-06-01"),
    },
  });
  console.log(`✅  Teacher        → ${teacherUser.email}  (${teacherProfile.employeeCode})`);

  // ── 6. SECTION (assigns class teacher) ───────────────────────────────────
  const sectionA = await prisma.section.upsert({
    where:  { classId_name: { classId: grade10.id, name: "A" } },
    update: { classTeacherId: teacherProfile.id },
    create: {
      name:           "A",
      schoolId:       school.id,
      classId:        grade10.id,
      classTeacherId: teacherProfile.id,
    },
  });
  console.log(`✅  Section        → ${grade10.name} — Section ${sectionA.name}`);

  // ── 7. SUBJECT ───────────────────────────────────────────────────────────
  const mathSubject = await prisma.subject.upsert({
    where: {
      schoolId_classId_name: {
        schoolId: school.id,
        classId:  grade10.id,
        name:     "Mathematics",
      },
    },
    update: {},
    create: {
      name:     "Mathematics",
      code:     "MATH-10",
      schoolId: school.id,
      classId:  grade10.id,
    },
  });

  // assign teacher to subject
  await prisma.teacherSubject.upsert({
    where: {
      teacherProfileId_subjectId: {
        teacherProfileId: teacherProfile.id,
        subjectId:        mathSubject.id,
      },
    },
    update: {},
    create: {
      teacherProfileId: teacherProfile.id,
      subjectId:        mathSubject.id,
    },
  });
  console.log(`✅  Subject        → ${mathSubject.name} assigned to ${teacherUser.name}`);

  // ── 8. STUDENT user ──────────────────────────────────────────────────────
  const studentUser = await prisma.user.upsert({
    where:  { email: "student@greenwood.edu" },
    update: { name: "Aarav Mehta", schoolId: school.id, isActive: true },
    create: {
      name:     "Aarav Mehta",
      email:    "student@greenwood.edu",
      password: hashed,
      role:     Role.STUDENT,
      gender:   Gender.MALE,
      isActive: true,
      schoolId: school.id,
    },
  });

  // 8a. STUDENT profile
  const studentProfile = await prisma.studentProfile.upsert({
    where:  { userId: studentUser.id },
    update: { sectionId: sectionA.id, rollNumber: "10A-001" },
    create: {
      userId:      studentUser.id,
      rollNumber:  "10A-001",
      admissionNo: "ADM-2024-001",
      dateOfBirth: new Date("2009-03-15"),
      bloodGroup:  "B+",
      sectionId:   sectionA.id,
    },
  });
  console.log(`✅  Student        → ${studentUser.email}  (Roll: ${studentProfile.rollNumber})`);

  // ── 9. PARENT user ───────────────────────────────────────────────────────
  const parentUser = await prisma.user.upsert({
    where:  { email: "parent@greenwood.edu" },
    update: { name: "Sunita Mehta", schoolId: school.id, isActive: true },
    create: {
      name:     "Sunita Mehta",
      email:    "parent@greenwood.edu",
      password: hashed,
      role:     Role.PARENT,
      gender:   Gender.FEMALE,
      isActive: true,
      schoolId: school.id,
    },
  });

  // 9a. PARENT profile
  const parentProfile = await prisma.parentProfile.upsert({
    where:  { userId: parentUser.id },
    update: { occupation: "Business" },
    create: {
      userId:     parentUser.id,
      occupation: "Business",
    },
  });

  // 9b. PARENT ↔ STUDENT link
  await prisma.parentStudent.upsert({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId:  parentProfile.id,
        studentProfileId: studentProfile.id,
      },
    },
    update: {},
    create: {
      parentProfileId:  parentProfile.id,
      studentProfileId: studentProfile.id,
      relation:         "Mother",
    },
  });
  console.log(`✅  Parent         → ${parentUser.email}  linked to ${studentUser.name}`);

  // ── 10. ANNOUNCEMENT ─────────────────────────────────────────────────────
  // Announcement has no unique field, so use findFirst guard instead of upsert
  const announcementExists = await prisma.announcement.findFirst({
    where: {
      schoolId: school.id,
      title:    "Welcome to Greenwood High School ERP!",
    },
  });

  if (!announcementExists) {
    await prisma.announcement.create({
      data: {
        title:    "Welcome to Greenwood High School ERP!",
        content:  "This is the official school management portal. " +
                  "All students, teachers, and parents can log in with their credentials.",
        schoolId: school.id,
      },
    });
  }
  console.log(`✅  Announcement   → Welcome notice created`);

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  console.log(`
${"─".repeat(62)}
  SEED COMPLETE — Demo Login Credentials
${"─".repeat(62)}
  Role          Email                        Password
${"─".repeat(62)}
  SUPER_ADMIN   superadmin@erp.com           ${DEFAULT_PASSWORD}
  SCHOOL_ADMIN  admin@greenwood.edu          ${DEFAULT_PASSWORD}
  TEACHER       teacher@greenwood.edu        ${DEFAULT_PASSWORD}
  STUDENT       student@greenwood.edu        ${DEFAULT_PASSWORD}
  PARENT        parent@greenwood.edu         ${DEFAULT_PASSWORD}
${"─".repeat(62)}

  School  : ${school.name}
  Class   : ${grade10.name}  →  Section ${sectionA.name}
  Subject : ${mathSubject.name}

  Tip: run  npx prisma studio  to inspect all records.
`);
}

main()
  .catch((err: unknown) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
