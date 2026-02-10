import { Skeleton } from "../ui/skeleton";

export default function GameCardSkeleton() {
    return (
      <div className="bg-card border-2 sm:border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] sm:dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)]">
        <Skeleton className="w-full aspect-3/4 rounded-none bg-stone-100 dark:bg-stone-800" />
        <div className="p-2 sm:p-4 border-t-2 sm:border-t-4 border-border">
          <Skeleton className="h-4 sm:h-6 w-3/4 bg-stone-100 dark:bg-stone-800 rounded-none" />
          <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2">
            <Skeleton className="h-1.5 sm:h-2 w-full bg-orange-50 dark:bg-orange-950 rounded-none" />
            <Skeleton className="h-3 sm:h-4 w-6 sm:w-8 bg-stone-100 dark:bg-stone-800 rounded-none" />
          </div>
        </div>
      </div>
    )
  }