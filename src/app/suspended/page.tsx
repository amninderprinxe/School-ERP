import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  CreditCard,
  Headphones,
  LogOut,
  Mail,
  ShieldAlert,
} from "lucide-react";

export const metadata = {
  title: "Subscription Inactive — Campus-X",
};

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  let schoolName = "Your Institution";
  let userEmail = "";

  try {
    const session = await auth();
    if (session?.user?.id) {
      userEmail = session.user.email ?? "";
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          school: {
            select: { name: true },
          },
        },
      });
      if (user?.school?.name) {
        schoolName = user.school.name;
      }
    }
  } catch (error) {
    console.error("[SUSPENDED_PAGE_SESSION_ERROR]", error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-8 sm:p-10 relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-lg text-white">
              CX
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-tight">Campus-X ERP</p>
              <p className="text-xs text-slate-400">Enterprise Cloud Platform</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            Service Inactive
          </span>
        </div>

        {/* Core Notice */}
        <div className="space-y-4">
          <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Subscription Suspended
            </h1>
            <p className="text-sm font-medium text-slate-300 mt-1">
              {schoolName}
            </p>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            The Campus-X enterprise subscription for this institution is currently inactive or suspended. Access to student databases, staff management, academics, and administrative dashboards has been temporarily restricted.
          </p>
        </div>

        {/* Action Steps Card */}
        <div className="my-6 rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 sm:p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            How to restore access:
          </p>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-200">Renew Subscription:</strong> Contact your account executive or Super Administrator to process the renewal payment.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-200">Instant Reactivation:</strong> Once verified, full portal capabilities and data access will be restored immediately without data loss.
              </span>
            </li>
          </ul>
        </div>

        {/* Contact & Support Section */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:support@campus-x.com?subject=Subscription%20Renewal%20Request"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-colors shadow-lg shadow-blue-600/20"
          >
            <Headphones className="w-4 h-4" />
            Contact Support & Billing
          </a>

          <form
            className="sm:w-auto"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>

        {userEmail && (
          <p className="text-[11px] text-slate-500 text-center mt-6">
            Signed in as: <span className="text-slate-400">{userEmail}</span>
          </p>
        )}
      </div>
    </div>
  );
}