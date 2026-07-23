import { requireRole }    from "@/lib/session";
import { prisma }         from "@/lib/db";
import Link               from "next/link";
import { RowActions }     from "@/components/ui/row-actions";
import { deleteHoliday }  from "@/action/holiday.actions";
import {
  HOLIDAY_TYPE_LABELS,
  HOLIDAY_TYPE_STYLE,
  HOLIDAY_TYPES,
}                         from "@/lib/validations/holiday";
import {
  CalendarOff,
  Plus,
  ChevronDown,
}                         from "lucide-react";
import type { HolidayType } from "@prisma/client";

export const metadata = { title: "Holidays" };

interface Props {
  searchParams: Promise<{
    year?:  string;
    type?:  string;
  }>;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday:  "short",
    day:      "numeric",
    month:    "long",
    year:     "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// Group holidays by month name for display
function groupByMonth(
  holidays: { id: string; name: string; date: Date; type: string; description: string | null }[],
): Map<string, typeof holidays> {
  const map = new Map<string, typeof holidays>();
  for (const h of holidays) {
    const key = new Date(h.date).toLocaleDateString("en-IN", {
      month: "long",
      year:  "numeric",
      timeZone: "Asia/Kolkata",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }
  return map;
}

export default async function HolidaysPage({ searchParams }: Props) {
  const user     = await requireRole(["SCHOOL_ADMIN"]);
  const dbUser   = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { schoolId: true },
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId)
    return <p className="p-8 text-red-500">No school assigned.</p>;

  const sp         = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearFilter  = parseInt(sp.year ?? String(currentYear)) || currentYear;
  const typeFilter  = (HOLIDAY_TYPES as readonly string[]).includes(sp.type ?? "")
    ? (sp.type as HolidayType)
    : undefined;

  const holidays = await prisma.holiday.findMany({
    where: {
      schoolId,
      ...(typeFilter && { type: typeFilter }),
      date: {
        gte: new Date(Date.UTC(yearFilter, 0,  1)),
        lte: new Date(Date.UTC(yearFilter, 11, 31)),
      },
    },
    orderBy: { date: "asc" },
  });

  // Year options: current year ± 1
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const byMonth     = groupByMonth(holidays);

  // Type count summary
  const typeCounts = holidays.reduce<Record<string, number>>(
    (acc, h) => ({ ...acc, [h.type]: (acc[h.type] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {holidays.length} holiday{holidays.length !== 1 ? "s" : ""} in{" "}
            {yearFilter}
          </p>
        </div>
        <Link
          href="/school-admin/holidays/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600
            hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
            transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </Link>
      </div>

      {/* ── Type summary pills ─────────────────────────────── */}
      {holidays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(HOLIDAY_TYPES).map((t) => {
            const cnt = typeCounts[t] ?? 0;
            if (cnt === 0) return null;
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-semibold rounded-full
                  ${HOLIDAY_TYPE_STYLE[t]}`}
              >
                {HOLIDAY_TYPE_LABELS[t]}
                <span className="font-bold">{cnt}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────── */}
      <form
        method="GET"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
      >
        <div className="flex flex-wrap gap-3">

          {/* Year */}
          <div className="relative">
            <select
              name="year"
              defaultValue={yearFilter}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Type */}
          <div className="relative">
            <select
              name="type"
              defaultValue={sp.type ?? ""}
              className="appearance-none border border-gray-300 rounded-lg
                px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {HOLIDAY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {HOLIDAY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
              text-sm font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
          
          <a  href="/school-admin/holidays"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600
              text-sm font-medium rounded-lg transition-colors inline-flex
              items-center"
          >
            Clear
          </a>
        </div>
      </form>

      {/* ── Holiday list ───────────────────────────────────── */}
      {holidays.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          py-16 text-center">
          <CalendarOff className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No holidays for {yearFilter}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add public holidays and school breaks so teachers are
            alerted when marking attendance.
          </p>
          <Link
            href="/school-admin/holidays/new"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2
              text-xs font-semibold text-blue-600 bg-blue-50
              hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add first holiday
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byMonth.entries()).map(([month, items]) => (
            <div
              key={month}
              className="bg-white rounded-xl border border-gray-100
                shadow-sm overflow-hidden"
            >
              {/* Month header */}
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100
                flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">{month}</p>
                <span className="text-xs text-gray-400">
                  {items.length} holiday{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Holiday rows */}
              <div className="divide-y divide-gray-50">
                {items.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-4 px-5 py-4
                      hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex
                      items-center justify-center shrink-0">
                      <CalendarOff className="w-5 h-5 text-indigo-500" />
                    </div>

                    {/* Name + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {h.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(h.date)}
                      </p>
                      {h.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {h.description}
                        </p>
                      )}
                    </div>

                    {/* Type badge */}
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold
                        rounded-full shrink-0
                        ${HOLIDAY_TYPE_STYLE[h.type as HolidayType]}`}
                    >
                      {HOLIDAY_TYPE_LABELS[h.type as HolidayType]}
                    </span>

                    {/* Actions */}
                    <RowActions
                      editHref={`/school-admin/holidays/${h.id}/edit`}
                      deleteAction={deleteHoliday.bind(null, h.id)}
                      entityLabel={`holiday "${h.name}"`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}