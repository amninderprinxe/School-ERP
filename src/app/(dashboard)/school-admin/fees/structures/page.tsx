import { requireRole }          from "@/lib/session";
import { prisma }               from "@/lib/db";
import Link                     from "next/link";
import { RowActions }           from "@/components/ui/row-actions";
import { deleteFeeStructure }   from "@/action/fee.actions";
import { ListOrdered, Plus, CalendarDays } from "lucide-react";
import { fmtCurrency }          from "@/lib/fee-utils";
import { AssignButton }         from "./assign-button";
import { SendReminderButton }   from "./send-reminder-button";

export const metadata = { title: "Fee Structures" };

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function FeeStructuresPage() {
  const user   = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId)
    return <p className="p-8 text-red-500">No school assigned.</p>;

  const structures = await prisma.feeStructure.findMany({
    where:   { schoolId },
    include: {
      feeCategory: true,
      class:       true,
      _count:      {
        select: { payments: true },
      },
    },
    orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
  });

  // For each structure get pending count (not filterable in _count directly)
  const pendingCounts = await prisma.feePayment.groupBy({
    by:    ["feeStructureId"],
    where: {
      schoolId,
      feeStructureId: { in: structures.map((s) => s.id) },
      status:         { in: ["PENDING", "PARTIAL"] },
    },
    _count: { id: true },
  });
  const pendingMap = new Map(
    pendingCounts.map((p) => [p.feeStructureId, p._count.id]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structures</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {structures.length} structure{structures.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/school-admin/fees/structures/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
            transition-colors"
        >
          <Plus className="w-4 h-4" /> New Structure
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {structures.length === 0 ? (
          <div className="py-16 text-center">
            <ListOrdered className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No fee structures yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Category", "Class", "Year", "Amount", "Due Date",
                    "Assigned", "",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-gray-500
                        uppercase tracking-wide
                        ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {structures.map((s) => {
                  const pendingCount = pendingMap.get(s.id) ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-50 rounded-lg flex
                            items-center justify-center shrink-0">
                            <ListOrdered className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {s.feeCategory.name}
                            </p>
                            {s.description && (
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium
                          bg-blue-50 text-blue-700 rounded-full">
                          {s.class?.name ?? "All Classes"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-gray-600">
                        {s.academicYear}
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {fmtCurrency(s.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          {s.dueDate && (
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          {formatDate(s.dueDate)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 text-xs font-medium
                            bg-gray-100 text-gray-600 rounded-full">
                            {s._count.payments} student
                            {s._count.payments !== 1 ? "s" : ""}
                          </span>
                          <AssignButton
                            structureId={s.id}
                            label={s.class?.name ?? "All"}
                          />
                          <SendReminderButton
                            structureId={s.id}
                            pendingCount={pendingCount}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <RowActions
                          editHref={`/school-admin/fees/structures/${s.id}/edit`}
                          deleteAction={deleteFeeStructure.bind(null, s.id)}
                          entityLabel={`fee structure (${s.feeCategory.name})`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
