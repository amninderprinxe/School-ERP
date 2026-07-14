import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { createPasswordResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "If an account exists with this email, a password reset link has been sent.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
    };

    if (typeof body.email !== "string") {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Always return the same response so attackers cannot discover
    // which email addresses are registered.
    if (!user || !user.isActive) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const appUrl = getAppUrl(request);
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail({
        recipientEmail: user.email,
        recipientName: user.name,
        resetUrl,
      });
    } catch (error) {
      await prisma.passwordResetToken.deleteMany({
        where: {
          tokenHash,
        },
      });

      console.error("Failed to send password reset email:", error);

      return NextResponse.json(
        { error: "Unable to send the reset email. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot-password request failed:", error);

    return NextResponse.json(
      { error: "Unable to process your request. Please try again." },
      { status: 500 },
    );
  }
}

function getAppUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  return new URL(request.url).origin;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
