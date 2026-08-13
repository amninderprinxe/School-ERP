import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // 1. Agar user logged in nahi hai, ta login te bhejo
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Agar user logged in hai, ta dashboard te bhejo
  redirect("/dashboard");
}