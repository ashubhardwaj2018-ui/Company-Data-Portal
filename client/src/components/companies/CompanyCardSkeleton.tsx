import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder that mirrors the CompanyCard DOM structure.
 * Matches the natural height of a loaded card to prevent layout shift (CLS).
 */
export function CompanyCardSkeleton() {
  return (
    <div className="ab-card flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Reg ID row */}
            <Skeleton className="h-3 w-24 rounded" />
            {/* Company name — two lines */}
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          {/* Status pill + compare button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Body — info rows */}
      <div className="px-4 py-3 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3 rounded" />
        <Skeleton className="h-3.5 w-1/2 rounded" />
        <Skeleton className="h-3.5 w-3/5 rounded" />
      </div>

      {/* Footer — authorized capital */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-lg">
        <Skeleton className="h-3 w-2/5 rounded" />
      </div>
    </div>
  );
}
