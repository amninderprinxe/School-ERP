import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            schoolId: true,
            isActive: true,
          },
        });

        if (!user) {
          throw new Error("No account found with this email.");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated. Contact admin.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Incorrect password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // `user` is only available on first sign-in
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.schoolId = (user.schoolId as string | null) ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});