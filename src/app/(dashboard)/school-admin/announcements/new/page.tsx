import { requireRole }        from "@/lib/session";
import { AnnouncementForm }   from "@/components/school-admin/announcement-form";
import { createAnnouncement } from "@/action/announcement.actions";
import Link                   from "next/link";
import { ArrowLeft }          from "lucide-react";

export const metadata = { title: "New Announcement" };

export default async function NewAnnouncementPage() {
  await requireRole(["SCHOOL_ADMIN"]);

  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/school-admin/announcements"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            New Announcement
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Publish a notice visible to all users in your school
          </p>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <AnnouncementForm action={createAnnouncement} mode="create" />
      </div>

    </div>
  );
}
