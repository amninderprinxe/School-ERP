"server action";
"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Standard Default Password
const DEFAULT_INITIAL_PASSWORD = "Password@123";

export async function createSchoolAdmin(formData: {
  schoolId: string;
  adminName: string;
  adminEmail: string;
}) {
  try {
    const { schoolId, adminName, adminEmail } = formData;
    const normalizedEmail = adminEmail.toLowerCase().trim();

    // 1. Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Is email naal already ek account exists karda hai!",
      };
    }

    // 2. Hash standard password "Password@123"
    const hashedPassword = await bcrypt.hash(DEFAULT_INITIAL_PASSWORD, 10);

    // 3. Create SCHOOL_ADMIN User
    const adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: normalizedEmail,
        loginId: normalizedEmail, // Email as Username
        password: hashedPassword,
        role: "SCHOOL_ADMIN",
        schoolId: schoolId,
        isActive: true,
      },
    });

    return {
      success: true,
      data: {
        name: adminUser.name,
        email: adminUser.email,
        username: adminUser.email,
        initialPassword: DEFAULT_INITIAL_PASSWORD,
      },
    };
  } catch (error: any) {
    console.error("Error creating school admin:", error);
    return {
      success: false,
      error: "School Admin create karan vich problem aayi hai.",
    };
  }
}