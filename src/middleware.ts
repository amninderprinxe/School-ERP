import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/login"];

const ROLE_DASHBOARD = {
  SUPER_ADMIN: "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
} as const;

const ROLE_ALLOWED_PREFIXES = {
  SUPER_ADMIN: ["/super-admin"],
  SCHOOL_ADMIN: ["/school-admin"],
  TEACHER: ["/teacher"],
  STUDENT: ["/student"],
  PARENT: ["/parent"],
} as const;

type Role = keyof typeof ROLE_DASHBOARD;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const role = token?.role as Role | undefined;

  if (isPublic && isAuthenticated && role) {
    return NextResponse.redirect(new URL(ROLE_DASHBOARD[role], req.url));
  }

  if (!isPublic && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && role) {
    const allowed = ROLE_ALLOWED_PREFIXES[role];

    const isAllowed =
      pathname === "/" || allowed.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD[role], req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};