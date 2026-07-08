"use client";

import { useTransition }       from "react";
import Link                    from "next/link";
import {
  Pencil, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { toggleSchoolStatus, deleteSchool } from "@/action/school.actions";
import type { SchoolStatus } from "@prisma/client";

interface SchoolRowActionsProps {
  schoolId: string;
  status:   SchoolStatus;
  name:     string;
}

export function SchoolRowActions({
  schoolId,
  status,
  name,
}: SchoolRowActionsProps) {
  const [pendingToggle, startToggle] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const isActive = status === "ACTIVE";

  const handleToggle = () => {
    const action = isActive ? "suspend" : "activate";
    if (
      !confirm(
        `${isActive ? "Suspend" : "Activate"} "${name}"?\n\n` +
        (isActive
          ? "Suspended schools will not be accessible to their users."
          : "Activating will restore access for all school users."),
      )
    )
      return;

    startToggle(async () => {
      const res = await toggleSchoolStatus(schoolId);
      if (!res.success) alert(`Could not ${action}: ${res.error}`);
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        `⚠️ Permanently delete "${name}"?\n\n` +
        "This will REMOVE ALL DATA for this school:\n" +
        "• All users (admins, teachers, students, parents)\n" +
        "• All classes, sections, subjects\n" +
        "• All announcements\n\n" +
        "This action CANNOT be undone. Type OK to confirm.",
      )
    )
      return;

    startDelete(async () => {
      const res = await deleteSchool(schoolId);
      if (!res.success) alert(`Delete failed: ${res.error}`);
    });
  };

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">

      {/* Edit */}
      <Link
        href={`/super-admin/schools/${schoolId}/edit`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
          font-medium text-gray-700 bg-gray-100 hover:bg-gray-200
          rounded-lg transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </Link>

      {/* Toggle status */}
      <button
        onClick={handleToggle}
        disabled={pendingToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
          font-medium rounded-lg transition-colors disabled:opacity-50
          ${isActive
            ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
            : "text-green-700 bg-green-50 hover:bg-green-100"}`}
      >
        {isActive
          ? <ToggleLeft  className="w-3.5 h-3.5" />
          : <ToggleRight className="w-3.5 h-3.5" />}
        {pendingToggle
          ? "Updating…"
          : isActive ? "Suspend" : "Activate"}
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={pendingDelete}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
          font-medium text-red-600 bg-red-50 hover:bg-red-100
          disabled:opacity-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {pendingDelete ? "Deleting…" : "Delete"}
      </button>

    </div>
  );
}