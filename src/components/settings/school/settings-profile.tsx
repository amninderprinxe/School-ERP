"use client";

import { useState, useTransition } from "react";
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  User, 
  Calendar, 
  Sparkles, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Lock
} from "lucide-react";
import { updateSchoolProfile } from "@/action/school-settings.actions";
import type { SchoolSettingsData } from "@/lib/validations/school-settings";

interface ProfileSectionProps {
  school: SchoolSettingsData;
  isSuperAdmin?: boolean; // 👈 Pass this flag from page or parent client wrapper
}

export function ProfileSection({ school, isSuperAdmin = false }: ProfileSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSchoolProfile(formData);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Profile updated successfully!" });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update profile." });
      }
    });
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">School Profile</h2>
            <p className="text-sm text-muted-foreground">
              Basic information and contact details about your school.
            </p>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium border">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Permission Notice if not Super Admin */}
      {!isSuperAdmin && (
        <div className="p-3.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-2.5 text-sm">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Only <strong>Super Admins</strong> have permission to modify school profile details.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden field for Timezone */}
        <input 
          type="hidden" 
          name="timezone" 
          value={school.timezone || "Asia/Kolkata"} 
        />

        {/* School Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            School Name {isSuperAdmin && <span className="text-destructive">*</span>}
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="name"
              name="name"
              type="text"
              disabled={!isSuperAdmin}
              required={isSuperAdmin}
              defaultValue={school.name || ""}
              placeholder="e.g. Saraswati Senior Secondary Public School"
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <label htmlFor="tagline" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tagline
          </label>
          <div className="relative">
            <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="tagline"
              name="tagline"
              type="text"
              disabled={!isSuperAdmin}
              defaultValue={school.tagline || ""}
              placeholder="e.g. Nurturing tomorrow's leaders"
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Principal Name & Founded Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="principalName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Principal's Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="principalName"
                name="principalName"
                type="text"
                disabled={!isSuperAdmin}
                defaultValue={school.principalName || ""}
                placeholder="e.g. Suresh Singla"
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="foundedYear" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Founded Year
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="foundedYear"
                name="foundedYear"
                type="number"
                disabled={!isSuperAdmin}
                min="1800"
                max={new Date().getFullYear()}
                defaultValue={school.foundedYear || ""}
                placeholder="2026"
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              School Email {isSuperAdmin && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                disabled={!isSuperAdmin}
                required={isSuperAdmin}
                defaultValue={school.email || ""}
                placeholder="school@example.com"
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="phone"
                name="phone"
                type="text"
                disabled={!isSuperAdmin}
                defaultValue={school.phone || ""}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <label htmlFor="website" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Website
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="website"
              name="website"
              type="url"
              disabled={!isSuperAdmin}
              defaultValue={school.website || ""}
              placeholder="https://www.yourschool.edu"
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <textarea
              id="address"
              name="address"
              rows={3}
              disabled={!isSuperAdmin}
              defaultValue={school.address || ""}
              placeholder="Full school address"
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none disabled:opacity-75 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Footer Actions (Only shown for Super Admin) */}
        {isSuperAdmin && (
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition shadow-sm text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}