"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { updateNotificationSettings } from "@/action/school-settings.actions";
import type { SchoolSettingsData } from "@/lib/validations/school-settings";
import {
  SettingsSection, SaveButton, Toggle, Field,
} from "./settings-ui";
import type { ActionResult } from "@/action/school-settings.actions";

export function NotificationSection({ school }: { school: SchoolSettingsData }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const [emailNotifications, setEmail] = useState(school.emailNotifications);
  const [smsNotifications, setSms] = useState(school.smsNotifications);
  const [maxAbsenceAlert, setAbsAlert] = useState(school.maxAbsenceAlert ?? 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("emailNotifications", String(emailNotifications));
      formData.append("smsNotifications", String(smsNotifications));
      formData.append("maxAbsenceAlert", String(maxAbsenceAlert));

      const res = await updateNotificationSettings(formData);
      setResult(res);
      if (res.success) setTimeout(() => setResult(null), 4000);
    });
  };

  return (
    <SettingsSection
      id="notifications"
      title="Notification Settings"
      description="Control how Campus-X sends alerts and reminders"
      icon={Bell}
      accent="blue"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">

          {/* Channels */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400
              uppercase tracking-wider mb-3">
              Notification Channels
            </p>
            <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              <Toggle
                checked={emailNotifications}
                onChange={setEmail}
                label="Email Notifications"
                description="Send alerts, fee reminders and announcements via email"
              />
              <Toggle
                checked={smsNotifications}
                onChange={setSms}
                label="SMS Notifications"
                description="Send SMS alerts for attendance, fees and urgent notices (requires Twilio)"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400
              uppercase tracking-wider mb-3">
              Feature Toggles
            </p>
            <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">

            </div>
          </div>

          {/* Absence alert threshold */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400
              uppercase tracking-wider mb-3">
              Absence Alert
            </p>
            <Field
              label="Consecutive Absences Before Alert"
              hint={`An alert is sent after ${maxAbsenceAlert} consecutive absent day${maxAbsenceAlert !== 1 ? "s" : ""}`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={maxAbsenceAlert}
                  onChange={(e) => setAbsAlert(parseInt(e.target.value))}
                  className="flex-1 accent-blue-600"
                  aria-label="Days before absence alert"
                />
                <div className="text-center shrink-0">
                  <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                    {maxAbsenceAlert}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    day{maxAbsenceAlert !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Field>
          </div>

          {/* Status overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Email",
                active: emailNotifications,
                on: "Active",
                off: "Disabled",
                color: "blue" as const,
              },
              {
                label: "SMS",
                active: smsNotifications,
                on: "Active",
                off: "Disabled",
                color: "emerald" as const,
              },
              {
                label: "Abs. Alert",
                active: true,
                on: `After ${maxAbsenceAlert}d`,
                off: "",
                color: "amber" as const,
              },
            ].map((item) => {
              const colorMap = {
                blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
                emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
                amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
              };
              return (
                <div
                  key={item.label}
                  className={`${colorMap[item.color]} rounded-xl p-3 text-center`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
                    {item.label}
                  </p>
                  <p className="text-[13px] font-extrabold">
                    {item.active ? item.on : item.off}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <SaveButton isPending={isPending} result={result} />
        </div>
      </form>
    </SettingsSection>
  );
}