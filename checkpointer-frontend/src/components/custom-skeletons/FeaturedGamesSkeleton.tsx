import { Skeleton } from "../ui/skeleton";
import GameCardSkeleton from "./GameCardSkeleton";

export function FeaturedGamesSkeleton({
    title = "Featured games",
    count = 4,
  }: {
    title?: string
    count?: number
  }) {
    return (
      <section className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            {title}
          </h2>
          <div className="mt-3 sm:mt-0 bg-orange-50 px-4 sm:px-6 py-2 border-2 sm:border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 bg-orange-300 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }