import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/lib/auth";
import { prisma }                    from "@/lib/db";

// POST /api/notifications/read
// Body: { id: string }

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let id: string | undefined;
  try {
    const body = await request.json();
    id = body.id;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (!id) return new NextResponse("id required", { status: 400 });

  // updateMany so we only touch the current user's notifications
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data:  { isRead: true },
  });

  return NextResponse.json({ ok: true });
}