import { Construction } from "lucide-react";
import Link             from "next/link";

interface ComingSoonProps {
  title:       string;
  description: string;
  phase?:      string;
  backHref?:   string;
  backLabel?:  string;
}

export function ComingSoon({
  title,
  description,
  phase      = "Phase 3",
  backHref,
  backLabel  = "Go Back",
}: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm
        py-20 text-center px-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center
          justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Coming Soon</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          {description}
        </p>
        <span className="inline-flex items-center mt-4 px-3 py-1.5
          text-xs font-semibold bg-amber-50 text-amber-700
          border border-amber-200 rounded-full">
          Planned for {phase}
        </span>
        {backHref && (
          <div className="mt-6">
            <Link
              href={backHref}
              className="inline-flex items-center px-4 py-2 text-sm
                font-medium text-gray-600 bg-gray-100 hover:bg-gray-200
                rounded-lg transition-colors"
            >
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}