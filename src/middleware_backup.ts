import { auth }           from "@/lib/auth";
import { NextResponse }   from "next/server";
import type { Role }      from "@prisma/client";

// ── Unauthenticated access allowed ───────────────────────────────
const PUBLIC_ROUTES = ["/login"];

// ── Authenticated, shared across ALL roles ────────────────────────
const SHARED_AUTH_ROUTES = ["/settings"];

// ── Role home dashboards ──────────────────────────────────────────
const ROLE_DASHBOARD: Record<Role, string> = {
  SUPER_ADMIN:  "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER:      "/teacher",
  STUDENT:      "/student",
  PARENT:       "/parent",
};

// ── Allowed path prefixes per role ────────────────────────────────
const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  SUPER_ADMIN:  ["/super-admin"],
  SCHOOL_ADMIN: ["/school-admin"],
  TEACHER:      ["/teacher"],
  STUDENT:      ["/student"],
  PARENT:       ["/parent"],
};

export default auth((req) => {
  const { auth: session, nextUrl } = req;
  const pathname = nextUrl.pathname;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  const isShared = SHARED_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  const isAuthenticated = !!session?.user;

  // ── Authenticated user on a public route → their dashboard ──────
  if (isPublic && isAuthenticated) {
    const dest = ROLE_DASHBOARD[session.user.role];
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // ── Unauthenticated user on a protected route → login ───────────
  if (!isPublic && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      encodeURIComponent(pathname),
    );
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated: enforce role-based path access ────────────────
  if (isAuthenticated) {
    const role    = session.user.role;
    const allowed = ROLE_ALLOWED_PREFIXES[role];

    const isAllowed =
      pathname === "/" ||
      isShared  ||         // /settings is accessible to every role
      allowed.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARD[role], req.url),
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
