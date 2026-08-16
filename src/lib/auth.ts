import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

// ============================================================
// 1. MODULE AUGMENTATION (TypeScript Safety)
// ============================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      schoolId: string | null;
      loginId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    schoolId: string | null;
    loginId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    schoolId: string | null;
    loginId: string | null;
  }
}

// ============================================================
// 2. MAIN AUTH CONFIGURATION
// ============================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email, Login ID or Student ID", type: "text" },
        email: { label: "Email (fallback)", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const rawIdentifier = (credentials?.identifier ?? credentials?.email) as string | undefined;
        const rawPassword = credentials?.password as string | undefined;

        console.log("[AUTH DEBUG] Received login attempt for:", rawIdentifier);

        if (
          typeof rawIdentifier !== "string" ||
          typeof rawPassword !== "string"
        ) {
          console.log("[AUTH DEBUG] Missing identifier or password in payload");
          return null;
        }

        const identifier = rawIdentifier.trim();
        const password = rawPassword;

        if (!identifier || !password) {
          console.log("[AUTH DEBUG] Blank identifier or password");
          return null;
        }

        const normalizedEmail = identifier.toLowerCase();
        const normalizedLoginId = identifier.toUpperCase();

        // 1. Search for user by email or loginId
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: normalizedEmail, mode: "insensitive" } },
              { loginId: { equals: normalizedLoginId, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            loginId: true,
            password: true,
            role: true,
            schoolId: true,
            isActive: true,
          },
        });

        if (!user) {
          console.log("[AUTH DEBUG] No user found in DB for:", normalizedEmail);
          return null;
        }

        console.log("[AUTH DEBUG] User record found:", {
          id: user.id,
          role: user.role,
          isActive: user.isActive,
          hasPassword: Boolean(user.password),
        });

        if (!user.isActive) {
          console.log("[AUTH DEBUG] Account is inactive (isActive = false)");
          return null;
        }

        if (!user.password) {
          console.log("[AUTH DEBUG] User record has no password hash");
          return null;
        }

        // 2. Compare hashed password
        const passwordMatches = await bcrypt.compare(password, user.password);
        console.log("[AUTH DEBUG] Password check result:", passwordMatches);

        if (!passwordMatches) {
          console.log("[AUTH DEBUG] Password mismatch for:", normalizedEmail);
          return null;
        }

        // 3. Return sanitized JWT payload
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          loginId: user.loginId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId ?? null;
        token.loginId = user.loginId ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.schoolId = (token.schoolId as string) ?? null;
        session.user.loginId = (token.loginId as string) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});