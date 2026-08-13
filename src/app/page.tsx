// app/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // 1. Logged in nahi hai -> Login page
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Role-based Redirect
  const role = session.user.role;

  switch (role) {
    case "SUPER_ADMIN":
      redirect("/super-admin");
    case "SCHOOL_ADMIN":
      redirect("/school-admin");
    case "TEACHER":
      redirect("/teacher");
    case "STUDENT":
      redirect("/student");
    default:
      redirect("/login");
  }
}