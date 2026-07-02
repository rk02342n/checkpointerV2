import { Skeleton } from "../ui/skeleton";

export default function GameCardSkeleton() {
    return (
      <div className="surface overflow-hidden">
        <Skeleton className="w-full aspect-3/4 rounded-t-[0.65rem]" />
        <div className="p-2 sm:p-4">
          <Skeleton className="h-4 sm:h-6 w-3/4" />
          <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2">
            <Skeleton className="h-1.5 sm:h-2 w-full" />
            <Skeleton className="h-3 sm:h-4 w-6 sm:w-8" />
          </div>
        </div>
      </div>
    )
  }