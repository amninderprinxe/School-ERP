import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Password reset is managed by your school administrator. Please contact your school administrator to reset your password.",
    },
    {
      status: 403,
    },
  );
}
