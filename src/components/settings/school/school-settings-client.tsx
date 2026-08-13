"use client";

import { Role } from "@prisma/client";
import type { SchoolSettingsData } from "@/lib/validations/school-settings";

// These will now 100% match the export functions you just renamed
import { ProfileSection } from "./settings-profile";
import { AcademicSection } from "./settings-academic";
import { FeeSettingsSection } from "./settings-fees";
import { NotificationSection } from "./settings-notifications";

export interface SchoolSettingsClientProps {
  school: SchoolSettingsData;
  userRole: Role;
}

export function SchoolSettingsClient({ school, userRole }: SchoolSettingsClientProps) {
  const isSuperAdmin = userRole === Role.SUPER_ADMIN;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          School Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage school profile, operational schedules, fee structures, and notifications.
        </p>
      </div>

      <div className="space-y-6">
        <ProfileSection school={school} isSuperAdmin={isSuperAdmin} />
        <AcademicSection school={school} />
        <FeeSettingsSection school={school} />
        <NotificationSection school={school} />
      </div>
    </div>
  );
}