import { Suspense }              from "react";
import { requireRole }           from "@/lib/session";
import { prisma }                from "@/lib/db";
import { AttendanceStats } from "../../../../components/attendance/attendance-stats";
import { AttendanceTable } from "../../../../components/attendance/attendance-table";
import {
  ParentFilters,
  type ChildOption,
} from "../../../../components/parent/parent-filters";
import {
  calcSummary,
  getCurrentMonth,
  isValidMonth,
  getMonthRange,
} from "../../../../lib/attendance-utils";
import { Baby }                  from "lucide-react";

export const metadata = { title: "Child Attendance" };

interface Props {
  searchParams: Promise<{ childId?: string; month?: string }>;
}

export default async function ParentAttendancePage({ searchParams }: Props) {
  const user     = await requireRole(["PARENT"]);
  const schoolId = user.schoolId!;
  const sp       = await searchParams;

  const month    = isValidMonth(sp.month) ? sp.month : getCurrentMonth();
  const { gte, lte } = getMonthRange(month);

  // ── Parent profile + all linked children ─────────────────────
  const parentProfile = await prisma.parentProfile.findUnique({
    where:   { userId: user.id },
    include: {
      children: {
        include: {
          studentProfile: {
            include: {
              user:    { select: { name: true, isActive: true } },
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">
            Parent profile not found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin.
          </p>
        </div>
      </div>
    );
  }

  const linkedChildren = parentProfile.children;

  if (linkedChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Child Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View your children&apos;s attendance records
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <Baby className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No children linked
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Contact your school admin to link your children to your account.
          </p>
        </div>
      </div>
    );
  }

  // ── Resolve selected child ────────────────────────────────────
  // Validate that the requested childId actually belongs to this parent
  const validChildIds = new Set(
    linkedChildren.map((c) => c.studentProfileId),
  );

  const selectedId =
    sp.childId && validChildIds.has(sp.childId)
      ? sp.childId
      : linkedChildren[0]!.studentProfileId;

  const selectedLink = linkedChildren.find(
    (c) => c.studentProfileId === selectedId,
  )!;
  const selectedChild  = selectedLink.studentProfile;
  const selectedChildUser = selectedChild.user;

  // ── Build ChildOption list for the selector ───────────────────
  const childOptions: ChildOption[] = linkedChildren.map((c) => ({
    studentProfileId: c.studentProfileId,
    name:             c.studentProfile.user.name,
    relation:         c.relation,
  }));

  // ── Attendance records for selected child + month ─────────────
  const records = await prisma.attendance.findMany({
    where: {
      studentProfileId: selectedId,
      schoolId,
      date: { gte, lte },
    },
    select: {
      id:      true,
      date:    true,
      status:  true,
      remarks: true,
    },
    orderBy: { date: "desc" },
  });

  const summary = calcSummary(records);

  const sectionLabel =
    selectedChild.section
      ? `${selectedChild.section.class.name} — Section ${selectedChild.section.name}`
      : "No section assigned";

  return (
    <div className="space-y-6">

      {/* ── Page header ────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Child Attendance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View attendance records for your children
        </p>
      </div>

      {/* ── Filters (child selector + month nav) ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Wrapped in Suspense for useSearchParams inside ParentFilters */}
        <Suspense
          fallback={
            <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
          }
        >
          <ParentFilters
            children={childOptions}
            selectedId={selectedId}
            currentMonth={month}
          />
        </Suspense>
      </div>

      {/* ── Selected child info card ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500
            rounded-full flex items-center justify-center text-white font-bold
            text-lg shrink-0 shadow">
            {selectedChildUser.name?.[0]?.toUpperCase() ?? "S"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-gray-900 truncate">
                {selectedChildUser.name}
              </p>
              {selectedLink.relation && (
                <span className="px-2 py-0.5 text-xs font-semibold
                  bg-blue-50 text-blue-700 rounded-full">
                  {selectedLink.relation}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sectionLabel}</p>
          </div>

          {/* Quick stats strip */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {[
              { label: "Present", value: summary.present, color: "text-green-600" },
              { label: "Absent",  value: summary.absent,  color: "text-red-600"   },
              { label: "This Month", value: `${summary.percentage}%`, color: summary.percentage >= 75 ? "text-green-700" : "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-xl font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Attendance summary stats ─────────────────────────── */}
      <AttendanceStats summary={summary} />

      {/* ── Records table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center
          justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Attendance Records
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {records.length} record{records.length !== 1 ? "s" : ""} this month
              for {selectedChildUser.name}
            </p>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">
            Month:{" "}
            <span className="font-semibold text-gray-600">{month}</span>
          </span>
        </div>

        <AttendanceTable
          records={records.map((r) => ({ ...r, date: new Date(r.date) }))}
          emptyText={`No attendance has been marked for ${selectedChildUser.name} this month.`}
        />
      </div>

    </div>
  );
}
