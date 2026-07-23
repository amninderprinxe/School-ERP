import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  Wallet,
  Tag,
  ListOrdered,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import {
  fmtCurrency,
  STATUS_STYLE,
  STATUS_LABEL,
} from "@/lib/fee-utils";

export const metadata = {
  title: "Fee Management",
};

export default async function FeesOverviewPage() {
  const user = await requireRole(["SCHOOL_ADMIN"]);

  // Fetch current school ID directly from database
  const dbUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      schoolId: true,
    },
  });

  const schoolId = dbUser?.schoolId;

  if (!schoolId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-600">
          No school assigned to this account.
        </p>
      </div>
    );
  }

  const [
    payments,
    categoryCount,
    structureCount,
    recentPayments,
  ] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        schoolId,
      },
      include: {
        feeStructure: {
          select: {
            amount: true,
          },
        },
      },
    }),

    prisma.feeCategory.count({
      where: {
        schoolId,
      },
    }),

    prisma.feeStructure.count({
      where: {
        schoolId,
      },
    }),

    prisma.feePayment.findMany({
      where: {
        schoolId,
        amountPaid: {
          gt: 0,
        },
      },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        feeStructure: {
          include: {
            feeCategory: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
  ]);

  // ── Summary calculations ──────────────────────────────────────

  const totalDue = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.feeStructure.amount),
    0,
  );

  const totalCollected = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amountPaid),
    0,
  );

  const totalWaived = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.waivedAmount),
    0,
  );

  const totalOutstanding = Math.max(
    0,
    totalDue - totalCollected - totalWaived,
  );

  const statusCounts = payments.reduce<Record<string, number>>(
    (counts, payment) => {
      counts[payment.status] =
        (counts[payment.status] ?? 0) + 1;

      return counts;
    },
    {},
  );

  const quickLinks = [
    {
      label: "Fee Categories",
      href: "/school-admin/fees/categories",
      icon: Tag,
      color: "text-purple-700",
      bg: "bg-purple-50",
      count: categoryCount,
    },
    {
      label: "Fee Structures",
      href: "/school-admin/fees/structures",
      icon: ListOrdered,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      count: structureCount,
    },
    {
      label: "Record Payment",
      href: "/school-admin/fees/collect",
      icon: CreditCard,
      color: "text-blue-700",
      bg: "bg-blue-50",
      count: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Fee Management
        </h1>

        <p className="mt-0.5 text-sm text-gray-500">
          Collection overview for your school
        </p>
      </div>

      {/* ── Summary statistics ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Fees Due",
            value: fmtCurrency(totalDue),
            icon: Wallet,
            color: "text-gray-900",
            bg: "bg-gray-50",
          },
          {
            label: "Collected",
            value: fmtCurrency(totalCollected),
            icon: TrendingUp,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Outstanding",
            value: fmtCurrency(totalOutstanding),
            icon: Clock,
            color:
              totalOutstanding > 0
                ? "text-red-600"
                : "text-emerald-700",
            bg:
              totalOutstanding > 0
                ? "bg-red-50"
                : "bg-emerald-50",
          },
          {
            label: "Waived",
            value: fmtCurrency(totalWaived),
            icon: CheckCircle2,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="
              flex items-start gap-3 rounded-xl
              border border-gray-100 bg-white
              p-4 shadow-sm
            "
          >
            <div
              className={`
                mt-0.5 flex h-9 w-9 shrink-0
                items-center justify-center rounded-lg
                ${item.bg}
              `}
            >
              <item.icon
                className={`h-4 w-4 ${item.color}`}
              />
            </div>

            <div className="min-w-0">
              <p
                className={`
                  truncate text-xl font-bold
                  ${item.color}
                `}
              >
                {item.value}
              </p>

              <p className="mt-0.5 text-xs font-medium text-gray-400">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status breakdown ───────────────────────────────── */}
      {payments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              "PENDING",
              "PARTIAL",
              "PAID",
              "WAIVED",
            ] as const
          ).map((status) => {
            const count = statusCounts[status] ?? 0;

            if (count === 0) {
              return null;
            }

            return (
              <span
                key={status}
                className={`
                  inline-flex items-center gap-1.5
                  rounded-full px-3 py-1.5
                  text-xs font-semibold
                  ${STATUS_STYLE[status]}
                `}
              >
                {STATUS_LABEL[status]}

                <span className="font-bold">
                  {count}
                </span>
              </span>
            );
          })}

          <span
            className="
              rounded-full bg-gray-100
              px-3 py-1.5 text-xs
              font-semibold text-gray-500
            "
          >
            Total: {payments.length} records
          </span>
        </div>
      )}

      {/* ── Quick navigation cards ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="
              group rounded-xl border border-gray-100
              bg-white p-5 shadow-sm transition-all
              hover:border-blue-200 hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div
                className={`
                  flex h-10 w-10 items-center
                  justify-center rounded-xl
                  ${link.bg}
                `}
              >
                <link.icon
                  className={`h-5 w-5 ${link.color}`}
                />
              </div>

              {link.count !== null && (
                <span className="text-2xl font-bold text-gray-900">
                  {link.count}
                </span>
              )}
            </div>

            <p
              className="
                mt-3 text-sm font-semibold
                text-gray-900 transition-colors
                group-hover:text-blue-700
              "
            >
              {link.label}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Recent payments ────────────────────────────────── */}
      <div
        className="
          overflow-hidden rounded-xl
          border border-gray-100
          bg-white shadow-sm
        "
      >
        <div
          className="
            flex items-center justify-between
            border-b border-gray-100
            px-6 py-4
          "
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Recent Payments
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Latest recorded fee payments
            </p>
          </div>

          <Link
            href="/school-admin/fees/collect"
            className="
              text-xs font-semibold text-blue-600
              hover:underline
            "
          >
            View All →
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-200" />

            <p className="text-sm text-gray-400">
              No payments recorded yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPayments.map((payment) => {
              const studentName =
                payment.studentProfile.user.name;

              return (
                <div
                  key={payment.id}
                  className="
                    flex flex-wrap items-center
                    justify-between gap-3
                    px-6 py-3.5 transition-colors
                    hover:bg-gray-50/50
                  "
                >
                  {/* Student details */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-full bg-emerald-100
                        text-xs font-bold
                        text-emerald-700
                      "
                    >
                      {studentName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {studentName}
                      </p>

                      <p className="truncate text-xs text-gray-400">
                        {
                          payment.feeStructure
                            .feeCategory.name
                        }
                      </p>
                    </div>
                  </div>

                  {/* Payment details and receipt */}
                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-700">
                        {fmtCurrency(
                          Number(payment.amountPaid),
                        )}
                      </p>

                      <span
                        className={`
                          inline-flex rounded-full
                          px-2 py-0.5 text-xs
                          font-semibold
                          ${STATUS_STYLE[payment.status]}
                        `}
                      >
                        {STATUS_LABEL[payment.status]}
                      </span>
                    </div>

                    <a
                      href={`/api/pdf/fee-receipt?studentProfileId=${payment.studentProfileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Download fee receipt for ${studentName}`}
                      aria-label={`Download fee receipt for ${studentName}`}
                      className="
                        inline-flex items-center gap-2
                        rounded-lg border
                        border-indigo-200 bg-indigo-50
                        px-3 py-2 text-xs font-semibold
                        text-indigo-700 transition-colors
                        hover:bg-indigo-100
                      "
                    >
                      <FileDown className="h-4 w-4" />

                      <span className="hidden sm:inline">
                        Receipt
                      </span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
