import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  CreditCard,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
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

  const encodedWhatsappMsg = encodeURIComponent(
    `Hello, I would like to renew the Campus-X subscription for ${schoolName}.`
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <div className="w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 sm:p-10 relative overflow-hidden">
        
        {/* Soft Background Accents */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-base text-white">
              CX
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 tracking-tight">Campus-X ERP</p>
              <p className="text-xs text-slate-500">Enterprise Cloud Platform</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
            <ShieldAlert className="w-3.5 h-3.5" />
            Service Inactive
          </span>
        </div>

        {/* Core Notice */}
        <div className="space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Subscription Suspended
            </h1>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              {schoolName}
            </p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            The Campus-X enterprise subscription for this institution is currently inactive or suspended. Access to student databases, staff management, academics, and administrative dashboards has been temporarily restricted.
          </p>
        </div>

        {/* Action Steps Card */}
        <div className="my-6 rounded-xl bg-slate-50/80 border border-slate-200/70 p-4 sm:p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            How to restore access:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">Renew Subscription:</strong> Contact support or your administrator to process the subscription renewal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">Instant Reactivation:</strong> Once renewed, full portal capabilities and historical data will be unlocked immediately without any data loss.
              </span>
            </li>
          </ul>
        </div>

        {/* Contact & Support Section */}
        <div className="border-t border-slate-100 pt-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp Quick Action */}
            <a
              href={`https://wa.me/919877731378?text=${encodedWhatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp: 98777-31378
            </a>

            {/* Email Support */}
            <a
              href="mailto:amninder99155@gmail.com?subject=Campus-X%20Subscription%20Renewal"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Email Billing & Support
            </a>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="tel:+919877731378"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              +91 98777 31378
            </a>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {userEmail && (
          <p className="text-[11px] text-slate-400 text-center mt-5">
            Signed in as: <span className="text-slate-600 font-medium">{userEmail}</span>
          </p>
        )}
      </div>
    </div>
  );
}