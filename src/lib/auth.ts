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
        // Accepts identifier OR email payload from frontend forms
        const rawIdentifier = (credentials?.identifier ?? credentials?.email) as string | undefined;
        const rawPassword = credentials?.password as string | undefined;

        if (
          typeof rawIdentifier !== "string" ||
          typeof rawPassword !== "string"
        ) {
          return null;
        }

        const identifier = rawIdentifier.trim();
        const password = rawPassword;

        if (!identifier || !password) {
          return null;
        }

        const normalizedEmail = identifier.toLowerCase();
        const normalizedLoginId = identifier.toUpperCase();

        // 1. Search for active user by email, login ID, or phone
        const user = await prisma.user.findFirst({
          where: {
            isActive: true,
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

        // 2. Guard against missing user or uninitialized passwords
        if (!user || !user.password) {
          return null;
        }

        // 3. Compare hashed password
        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
          return null;
        }

        // 4. Return sanitized JWT payload
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