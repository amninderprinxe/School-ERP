import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const MINIMUM_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
    };

    if (
      typeof body.token !== "string" ||
      typeof body.password !== "string" ||
      typeof body.confirmPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid password reset request." },
        { status: 400 },
      );
    }

    const token = body.token.trim();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!token) {
      return NextResponse.json(
        { error: "The password reset link is invalid." },
        { status: 400 },
      );
    }

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          error: `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    if (!hasLetterAndNumber(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one letter and one number." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    const tokenHash = hashPasswordResetToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!resetToken || resetToken.expiresAt <= new Date()) {
      if (resetToken) {
        await prisma.passwordResetToken.delete({
          where: {
            id: resetToken.id,
          },
        });
      }

      return NextResponse.json(
        {
          error:
            "This password reset link is invalid or has expired. Request a new link.",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset-password request failed:", error);

    return NextResponse.json(
      { error: "Unable to reset your password. Please try again." },
      { status: 500 },
    );
  }
}

function hasLetterAndNumber(password: string) {
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}
