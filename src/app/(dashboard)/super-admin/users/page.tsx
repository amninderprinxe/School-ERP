import { requireRole } from "@/lib/session";

export const metadata = { title: "Super Admin — Users" };

export default async function SuperAdminUsersPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Super Admin user management will be added later.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-gray-500">
          This page is currently a placeholder.
        </p>
      </div>
    </div>
  );
}