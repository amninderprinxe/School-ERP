import { auth }                from "@/lib/auth";
import { redirect }            from "next/navigation";
import { prisma }              from "@/lib/db";
import { ChangePasswordForm }  from "@/components/settings/change-password-form";
import { EditProfileForm }     from "@/components/settings/edit-profile-form";
import { formatRoleLabel }     from "@/lib/utils";
import { ShieldCheck, Lock, UserCircle } from "lucide-react";

export const metadata = { title: "Account Settings" };

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
      avatarUrl: true,
      createdAt: true,
      school:    { select: { name: true } },
    },
  });

  if (!user) redirect("/login");

  const readOnlyFields = [
    { label: "Email Address",  value: user.email                       },
    { label: "Role",           value: formatRoleLabel(user.role)        },
    { label: "Gender",         value: user.gender    ?? "—"             },
    { label: "School",         value: user.school?.name ?? "—"          },
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

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your profile, photo and security preferences
        </p>
      </div>

      {/* ── Edit Profile card ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Edit Profile
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Update your name, phone number and profile photo
            </p>
          </div>
        </div>
        <div className="p-6">
          <EditProfileForm
            initialName={user.name}
            initialPhone={user.phone}
            initialAvatarUrl={user.avatarUrl}
            userInitials={getInitials(user.name)}
          />
        </div>
      </div>

      {/* ── Read-only info card ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Account Information
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              These fields are managed by your school admin
            </p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {readOnlyFields.map((field) => (
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

      {/* ── Change password card ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Change Password
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose a strong password — at least 8 characters
            </p>
          </div>
        </div>
        <div className="p-6">
          <ChangePasswordForm role={user.role} />
        </div>
      </div>

    </div>
  );
}
