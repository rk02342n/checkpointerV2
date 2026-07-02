import { Skeleton } from "../ui/skeleton";

// Mirrors the "browse" variant of StandardGameCard exactly so real cards
// drop in with zero layout shift when data arrives.
function BrowseGameCardSkeleton() {
  return (
    <div className="surface bg-pop-50 overflow-hidden">
      <Skeleton className="w-full h-48 sm:h-56 rounded-t-[0.65rem]" />
      <div className="p-4 border-t-4 border-border">
        <Skeleton className="h-6 w-3/4" />
        <div className="mt-2 flex flex-wrap gap-1 h-5 overflow-hidden">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-8" />
        </div>
      </div>
    </div>
  );
}

export function BrowseGamesSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <BrowseGameCardSkeleton key={i} />
      ))}
    </div>
  );
}
