import { requireRole }        from "@/lib/session";
import { prisma }             from "@/lib/db";
import { AnnouncementForm }   from "@/components/school-admin/announcement-form";
import { updateAnnouncement } from "@/action/announcement.actions";
import Link                   from "next/link";
import { ArrowLeft }          from "lucide-react";
import { notFound }           from "next/navigation";

export const metadata = { title: "Edit Announcement" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAnnouncementPage({ params }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;
  const { id }   = await params;

  const announcement = await prisma.announcement.findFirst({
    where: { id, schoolId },
  });

  if (!announcement) notFound();

  const boundAction = updateAnnouncement.bind(null, announcement.id);

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
            Edit Announcement
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
            {announcement.title}
          </p>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <AnnouncementForm
          action={boundAction}
          initialData={{
            title:   announcement.title,
            content: announcement.content,
          }}
          mode="edit"
        />
      </div>

    </div>
  );
}
