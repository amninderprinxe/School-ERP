import { auth } from "@/lib/auth";
import { getDashboardPath } from "@/lib/utils";
import { redirect } from "next/navigation";

/**
 * Root page: redirect authenticated users to their role dashboard,
 * unauthenticated users to login.
 * The middleware handles this for most routes, but this covers
 * a direct visit to "/".
 */
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(getDashboardPath(session.user.role));
}