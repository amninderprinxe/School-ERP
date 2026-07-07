import { auth }                from "@/lib/auth";
import { redirect }            from "next/navigation";
import { prisma }              from "@/lib/db";
import { ChangePasswordForm }  from "@/components/settings/change-password-form";
import { formatRoleLabel }     from "@/lib/utils";
import { User, Lock, ShieldCheck } from "lucide-react";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      phone:     true,
      gender:    true,
      isActive:  true,
      createdAt: true,
      school:    { select: { name: true } },
    },
  });

  if (!user) redirect("/login");

  const profileFields = [
    { label: "Full Name",     value: user.name                        },
    { label: "Email Address", value: user.email                       },
    { label: "Role",          value: formatRoleLabel(user.role)        },
    { label: "Gender",        value: user.gender    ?? "—"             },
    { label: "Phone",         value: user.phone     ?? "—"             },
    { label: "School",        value: user.school?.name ?? "—"          },
    {
      label: "Account Status",
      value: user.isActive ? "Active" : "Inactive",
    },
    {
      label: "Member Since",
      value: new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      }),
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your profile and security preferences
        </p>
      </div>

      {/* ── Profile info card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Profile Information
            </h2>
            <p className="text-xs text-gray-400">
              Your account details (read-only)
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Avatar + name strip */}
          <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-50">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600
              rounded-full flex items-center justify-center text-white text-2xl
              font-bold shrink-0 shadow-md">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5
                text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                {formatRoleLabel(user.role)}
              </span>
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profileFields.map((field) => (
              <div
                key={field.label}
                className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3"
              >
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {field.label}
                </p>
                <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Change password card ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Change Password
            </h2>
            <p className="text-xs text-gray-400">
              Choose a strong password — at least 8 characters
            </p>
          </div>
        </div>
        <div className="p-6">
          <ChangePasswordForm />
        </div>
      </div>

    </div>
  );
}