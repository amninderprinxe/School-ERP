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
// 2. MAIN AUTH CONFIGURATION (MySQL Compatible)
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

        try {
          // MySQL is case-insensitive by default (NO mode: "insensitive" needed)
          const user = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [
                { email: normalizedEmail },
                { loginId: normalizedLoginId },
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

          if (!user || !user.password) {
            return null;
          }

          // Compare hashed password
          const passwordMatches = await bcrypt.compare(password, user.password);

          if (!passwordMatches) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            loginId: user.loginId,
          };
        } catch (error) {
          console.error("[AUTH_ERROR]", error);
          return null;
        }
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