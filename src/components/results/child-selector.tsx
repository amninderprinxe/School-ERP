"use client";

import { useRouter }  from "next/navigation";
import { Baby }       from "lucide-react";
import { Suspense }   from "react";

export interface ChildOption {
  studentProfileId: string;
  name:             string;
  relation:         string | null;
}

interface Props {
  children:   ChildOption[];
  selectedId: string;
}

function ChildSelectorInner({ children, selectedId }: Props) {
  const router = useRouter();

  if (children.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200
      rounded-xl px-3 py-2 shadow-sm">
      <Baby className="w-4 h-4 text-gray-400 shrink-0" />
      <select
        value={selectedId}
        onChange={(e) =>
          router.push(`/parent/results?childId=${e.target.value}`)
        }
        className="text-sm font-semibold text-gray-700 bg-transparent
          focus:outline-none cursor-pointer pr-1"
      >
        {children.map((c) => (
          <option key={c.studentProfileId} value={c.studentProfileId}>
            {c.name}
            {c.relation ? ` (${c.relation})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ChildSelector(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
      }
    >
      <ChildSelectorInner {...props} />
    </Suspense>
  );
}