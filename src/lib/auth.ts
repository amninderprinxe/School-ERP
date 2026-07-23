import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
          credentials?.identifier ?? "",
        ).trim();

        const password = String(
          credentials?.password ?? "",
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
              {
                email: normalizedEmail,
              },
              {
                loginId: normalizedLoginId,
              },
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
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.password,
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
        token.id = user.id as string;
        token.role = user.role as Role;
        token.schoolId =
          (user.schoolId as string | null) ?? null;

        token.loginId =
          (user.loginId as string | null) ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.schoolId =
          token.schoolId as string | null;

        session.user.loginId =
          token.loginId as string | null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
