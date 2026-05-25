import { PrismaClient, Role, Gender, SchoolStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const SALT_ROUNDS = 10;
  const DEFAULT_PASSWORD = "Password@123";
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ── 1. SUPER ADMIN (no school) ──────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@erp.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@erp.com",
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      gender: Gender.MALE,
    },
  });
  console.log("✅ Super Admin:", superAdmin.email);

  // ── 2. SCHOOL (Tenant) ──────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { slug: "greenwood-high" },
    update: {},
    create: {
      name: "Greenwood High School",
      slug: "greenwood-high",
      address: "123 Main Street, Springfield",
      phone: "+91-9876543210",
      email: "admin@greenwood.edu",
      status: SchoolStatus.ACTIVE,
    },
  });
  console.log("✅ School:", school.name);

  // ── 3. SCHOOL ADMIN ─────────────────────────────────────────────────
  const schoolAdmin = await prisma.user.upsert({
    where: { email: "admin@greenwood.edu" },
    update: {},
    create: {
      name: "School Admin",
      email: "admin@greenwood.edu",
      password: hashedPassword,
      role: Role.SCHOOL_ADMIN,
      gender: Gender.FEMALE,
      schoolId: school.id,
    },
  });
  console.log("✅ School Admin:", schoolAdmin.email);

  // ── 4. CLASS ────────────────────────────────────────────────────────
  const classGrade10 = await prisma.class.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "Grade 10" } },
    update: {},
    create: {
      name: "Grade 10",
      schoolId: school.id,
    },
  });

  // ── 5. SECTION ──────────────────────────────────────────────────────
  const sectionA = await prisma.section.upsert({
    where: { classId_name: { classId: classGrade10.id, name: "A" } },
    update: {},
    create: {
      name: "A",
      schoolId: school.id,
      classId: classGrade10.id,
    },
  });
  console.log("✅ Class & Section: Grade 10-A");

  // ── 6. TEACHER ──────────────────────────────────────────────────────
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@greenwood.edu" },
    update: {},
    create: {
      name: "Ravi Sharma",
      email: "teacher@greenwood.edu",
      password: hashedPassword,
      role: Role.TEACHER,
      gender: Gender.MALE,
      schoolId: school.id,
      teacherProfile: {
        create: {
          employeeCode: "TCH-001",
          qualification: "M.Sc Mathematics",
          joiningDate: new Date("2020-06-01"),
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log("✅ Teacher:", teacher.email);

  // Assign teacher as class teacher of section A
  await prisma.section.update({
    where: { id: sectionA.id },
    data: { classTeacherId: teacher.teacherProfile!.id },
  });

  // ── 7. SUBJECT ──────────────────────────────────────────────────────
  const mathSubject = await prisma.subject.upsert({
    where: {
      schoolId_classId_name: {
        schoolId: school.id,
        classId: classGrade10.id,
        name: "Mathematics",
      },
    },
    update: {},
    create: {
      name: "Mathematics",
      code: "MATH-10",
      schoolId: school.id,
      classId: classGrade10.id,
    },
  });

  // Assign teacher to subject
  await prisma.teacherSubject.upsert({
    where: {
      teacherProfileId_subjectId: {
        teacherProfileId: teacher.teacherProfile!.id,
        subjectId: mathSubject.id,
      },
    },
    update: {},
    create: {
      teacherProfileId: teacher.teacherProfile!.id,
      subjectId: mathSubject.id,
    },
  });
  console.log("✅ Subject: Mathematics assigned to Ravi Sharma");

  // ── 8. STUDENT ──────────────────────────────────────────────────────
  const student = await prisma.user.upsert({
    where: { email: "student@greenwood.edu" },
    update: {},
    create: {
      name: "Aarav Mehta",
      email: "student@greenwood.edu",
      password: hashedPassword,
      role: Role.STUDENT,
      gender: Gender.MALE,
      schoolId: school.id,
      studentProfile: {
        create: {
          rollNumber: "10A-001",
          admissionNo: "ADM-2024-001",
          dateOfBirth: new Date("2009-03-15"),
          bloodGroup: "B+",
          sectionId: sectionA.id,
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log("✅ Student:", student.email);

  // ── 9. PARENT ───────────────────────────────────────────────────────
  const parent = await prisma.user.upsert({
    where: { email: "parent@greenwood.edu" },
    update: {},
    create: {
      name: "Sunita Mehta",
      email: "parent@greenwood.edu",
      password: hashedPassword,
      role: Role.PARENT,
      gender: Gender.FEMALE,
      schoolId: school.id,
      parentProfile: {
        create: {
          occupation: "Business",
        },
      },
    },
    include: { parentProfile: true },
  });
  console.log("✅ Parent:", parent.email);

  // Link parent to student
  await prisma.parentStudent.upsert({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId: parent.parentProfile!.id,
        studentProfileId: student.studentProfile!.id,
      },
    },
    update: {},
    create: {
      parentProfileId: parent.parentProfile!.id,
      studentProfileId: student.studentProfile!.id,
      relation: "Mother",
    },
  });

  // ── 10. ANNOUNCEMENT ────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      title: "Welcome to Greenwood High School ERP!",
      content:
        "This is the official school management portal. All students, teachers, and parents can log in with their credentials.",
      schoolId: school.id,
    },
  });
  console.log("✅ Announcement created");

  // ── SUMMARY ─────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete! Login credentials:");
  console.log("─────────────────────────────────────────");
  console.log("Role          | Email                    | Password");
  console.log("─────────────────────────────────────────");
  console.log("SUPER_ADMIN   | superadmin@erp.com       |", DEFAULT_PASSWORD);
  console.log("SCHOOL_ADMIN  | admin@greenwood.edu      |", DEFAULT_PASSWORD);
  console.log("TEACHER       | teacher@greenwood.edu    |", DEFAULT_PASSWORD);
  console.log("STUDENT       | student@greenwood.edu    |", DEFAULT_PASSWORD);
  console.log("PARENT        | parent@greenwood.edu     |", DEFAULT_PASSWORD);
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });