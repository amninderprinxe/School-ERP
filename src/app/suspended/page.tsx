import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlertOctagon, LogOut } from "lucide-react";

export const metadata = {
  title: "School Suspended — Campus-X",
};

export default async function SuspendedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      school: {
        select: {
          name: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  const schoolName = dbUser?.school?.name || "Your School";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertOctagon className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Your School is Suspended
          </h1>
          <p className="text-sm font-semibold text-red-600 mt-1">
            {schoolName}
          </p>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">
          Access to Campus-X for this school has been temporarily suspended by the Super Administrator. All portal features and dashboards are currently inaccessible.
        </p>

        <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
          <p className="text-xs text-gray-400">
            Please contact support or your Super Admin for reactivation.
          </p>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}