import { auth }               from "@/lib/auth";
import { prisma }             from "@/lib/db";
import { redirect }           from "next/navigation";
import { EditProfileForm }    from "@/components/settings/edit-profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ThemeSection }       from "@/components/settings/theme-section";
import { User, Palette, Info, Lock } from "lucide-react";

export const metadata = { title: "Settings" };

function Section({
  title, subtitle, icon: Icon, children,
}: {
  title:    string;
  subtitle: string;
  icon:     React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl
      border border-gray-100 dark:border-gray-700/60
      shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none
      overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4
        border-b border-gray-100 dark:border-gray-700/60">
        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950 rounded-xl
          flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden />
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
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
      phone:     true,
      gender:    true,
      avatarUrl: true,
      role:      true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-5 max-w-2xl pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Appearance */}
      <Section
        title="Appearance"
        subtitle="Customize how Campus-X looks for you"
        icon={Palette}
      >
        <ThemeSection />
      </Section>

      {/* Profile */}
      <Section
        title="Edit Profile"
        subtitle="Update your name, phone, avatar and bio"
        icon={User}
      >
        <EditProfileForm initialName={""} initialPhone={""} initialAvatarUrl={""} userInitials={""} {...user} />
      </Section>

      {/* Account info */}
      <Section
        title="Account Info"
        subtitle="Your login credentials and account details"
        icon={Info}
      >
        <div className="space-y-3">
          {[
            { label: "Email",  value: user.email },
            { label: "Role",   value: user.role.replace("_", " ") },
            { label: "User ID",value: user.id    },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2
              border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
              <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                {row.label}
              </p>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100
                font-mono truncate max-w-[240px]">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Password */}
      <Section
        title="Change Password"
        subtitle="Set a new password for your account"
        icon={Lock}
      >
        <ChangePasswordForm role={"SUPER_ADMIN"} />
      </Section>
    </div>
  );
}