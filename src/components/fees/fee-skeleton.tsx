export function FeeKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-[118px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}

export function FeeChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 h-[320px] bg-white dark:bg-gray-800/80
        rounded-2xl border border-gray-100 dark:border-gray-700/60 animate-pulse" />
      <div className="h-[320px] bg-white dark:bg-gray-800/80 rounded-2xl
        border border-gray-100 dark:border-gray-700/60 animate-pulse" />
    </div>
  );
}

export function FeeCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-[280px] rounded-2xl bg-white dark:bg-gray-800/80
            border border-gray-100 dark:border-gray-700/60 animate-pulse"
        />
      ))}
    </div>
  );
}