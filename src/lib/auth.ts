import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

// 1. Module Augmentation for TypeScript Safety
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

// 2. Main Auth Config
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Vercel deployment laye mandatory hai
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      credentials: {
        identifier: {
          label: "Email or Student ID",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const identifier = String(
          credentials?.identifier ?? ""
        ).trim();

        const password = String(
          credentials?.password ?? ""
        );

        if (!identifier || !password) {
          return null;
        }

        const normalizedEmail = identifier.toLowerCase();
        const normalizedLoginId = identifier.toUpperCase();

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

        const passwordMatches = await bcrypt.compare(
          password,
          user.password
        );

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
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId ?? null;
        session.user.loginId = token.loginId ?? null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});