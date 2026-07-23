import { requireRole }         from "@/lib/session";
import { prisma }              from "@/lib/db";
import Link                    from "next/link";
import { RowActions }          from "@/components/ui/row-actions";
import { deleteAnnouncement }  from "@/action/announcement.actions";
import { Megaphone, Plus }     from "lucide-react";

export const metadata = { title: "Announcements" };

// Helper — truncate long content for preview column
function preview(text: string, max = 90): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…";
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

export default async function AnnouncementsPage() {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const schoolId = user.schoolId!;

  const announcements = await prisma.announcement.findMany({
    where:   { schoolId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {announcements.length} announcement
            {announcements.length !== 1 ? "s" : ""} published
          </p>
        </div>
        <Link
          href="/school-admin/announcements/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
            transition-colors focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </Link>
      </div>

      {/* ── Table card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {announcements.length === 0 ? (
          /* ── Empty state ─────────────────────────────────── */
          <div className="py-16 text-center">
            <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No announcements yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Publish your first announcement to notify all users in your school.
            </p>
            <Link
              href="/school-admin/announcements/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
                text-xs font-semibold text-blue-600 bg-blue-50
                hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create first announcement
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Head */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Title", "Preview", "Published On", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold
                        text-gray-500 uppercase tracking-wide
                        ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-50">
                {announcements.map((ann) => (
                  <tr
                    key={ann.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Title */}
                    <td className="px-5 py-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg
                          flex items-center justify-center shrink-0">
                          <Megaphone className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {ann.title}
                        </span>
                      </div>
                    </td>

                    {/* Content preview */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {preview(ann.content)}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDate(ann.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        editHref={`/school-admin/announcements/${ann.id}/edit`}
                        deleteAction={deleteAnnouncement.bind(null, ann.id)}
                        entityLabel="announcement"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
