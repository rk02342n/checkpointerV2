import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { useInfiniteQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { browseGames, type Game, type BrowseGamesParams } from "@/lib/gameQuery"

type SortBy = "rating" | "year" | "name"
type SortOrder = "asc" | "desc"

const ITEMS_PER_PAGE = 24

function getYear(dateStr: string | Date | null): string {
  if (!dateStr) return "N/A"
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  const y = d.getFullYear()
  return Number.isFinite(y) ? y.toString() : "N/A"
}

function formatRating(value: Game["igdbRating"]): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return null
  return Math.round(n)
}

export const Route = createFileRoute("/browse")({
  component: BrowseGames,
})

export default function BrowseGames() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("rating")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [yearFilter, setYearFilter] = useState<string>("all")

  const navigate = useNavigate()

  const {
    data,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['browse-games-infinite', { q: searchQuery || undefined, sortBy, sortOrder, year: yearFilter !== "all" ? yearFilter : undefined }],
    queryFn: async ({ pageParam = 0 }) => {
      const params: BrowseGamesParams = {
        q: searchQuery || undefined,
        sortBy,
        sortOrder,
        year: yearFilter !== "all" ? yearFilter : undefined,
        limit: ITEMS_PER_PAGE,
        offset: pageParam,
      }
      return browseGames(params)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.offset + lastPage.pagination.limit
      }
      return undefined
    },
    staleTime: 1000 * 60 * 2,
  })

  const allGames = data?.pages.flatMap(page => page.games) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0
  const years = data?.pages[0]?.years ?? []

  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  return (
    <div className="min-w-full overflow-x-hidden text-black selection:bg-green-500/30 outline-black rounded-xl">
      <Navbar />

      <main className="container w-screen mx-auto my-4 px-4 py-8 min-h-[calc(100vh-64px)] bg-[rgb(255,220,159)] border-2 border-black rounded-xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-black font-serif tracking-tighter uppercase">
              Browse Games
            </h1>
            <p className="text-lg font-semibold text-black/70">
              Discover your next adventure
            </p>
          </div>

          {/* Search & Filters Section */}
          <section className="px-6 py-6 rounded-xl border-black border-2 bg-[rgb(78,195,90)]">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-full py-3 pl-12 pr-4 text-black placeholder:text-black/50 focus:outline-black focus:outline-4 focus:outline-offset-0"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold uppercase tracking-wider text-white">
                  Sort:
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split("-") as [SortBy, SortOrder]
                    setSortBy(newSortBy)
                    setSortOrder(newSortOrder)
                  }}
                  className="bg-white border-2 border-black px-3 py-2 text-sm font-medium cursor-pointer focus:outline-black focus:outline-2"
                >
                  <option value="rating-desc">Rating (High to Low)</option>
                  <option value="rating-asc">Rating (Low to High)</option>
                  <option value="year-desc">Year (Newest)</option>
                  <option value="year-asc">Year (Oldest)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold uppercase tracking-wider text-white">
                  Year:
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-white border-2 border-black px-3 py-2 text-sm font-medium cursor-pointer focus:outline-black focus:outline-2"
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Results Count */}
          <div className="px-2">
            <p className="text-sm font-bold uppercase tracking-wider text-black/70">
              {isPending ? (
                "Loading games..."
              ) : error ? (
                "Error loading games"
              ) : (
                `Showing ${allGames.length} of ${totalCount} games`
              )}
            </p>
          </div>

          {/* Game Grid */}
          <section className="px-4 py-6 rounded-xl border-black border-2 bg-amber-200/50">
            {isPending ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-red-600">
                  Failed to load games. Please try again.
                </p>
              </div>
            ) : allGames.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-black/60">
                  No games found matching your criteria
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allGames.map((game) => {
                    const rating = formatRating(game.igdbRating)
                    const year = getYear(game.releaseDate)

                    return (
                      <Card
                        key={game.id}
                        className="relative mx-auto w-full bg-amber-100 max-w-sm pt-0 outline-4 outline-black border-black rounded-none hover:outline-8 active:border-4 active:border-black cursor-pointer"
                      >
                        <button
                          onClick={() => handleGameClick(game)}
                          className="text-left w-full"
                        >
                          {game.coverUrl ? (
                            <img
                              src={game.coverUrl}
                              alt={game.name}
                              className="relative z-20 aspect-9/16 w-full object-cover h-48 sm:h-64 md:h-80"
                              loading="lazy"
                            />
                          ) : (
                            <div className="relative z-20 aspect-9/16 w-full h-48 sm:h-64 md:h-80 bg-amber-200 flex items-center justify-center">
                              <span className="text-black/40 text-sm">No Image</span>
                            </div>
                          )}

                          <CardHeader className="px-4 py-4">
                            <CardAction>
                              <Badge
                                variant="secondary"
                                className="border border-black bg-amber-200 text-black"
                              >
                                {year}
                              </Badge>
                              {rating !== null && (
                                <Badge
                                  variant="secondary"
                                  className="border border-black bg-green-200 text-black ml-1"
                                >
                                  {rating}
                                </Badge>
                              )}
                            </CardAction>
                            <CardTitle className="text-black p-0">
                              {game.name.split(':')[0]}
                            </CardTitle>
                          </CardHeader>
                        </button>
                      </Card>
                    )
                  })}
                </div>

                {/* Load More Button */}
                {hasNextPage && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="pop"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-8 py-3 text-black font-bold"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${totalCount - allGames.length} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { bg: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  )
}

function GameCardSkeleton() {
  return (
    <Card className="relative mx-auto w-full bg-amber-100 max-w-sm pt-0 outline-4 outline-black border-black rounded-none">
      <Skeleton className="aspect-9/16 w-full h-48 sm:h-64 md:h-80 rounded-none bg-amber-200" />
      <CardHeader className="px-4 py-4">
        <CardAction>
          <Skeleton className="h-5 w-12 rounded-full bg-amber-200" />
          <Skeleton className="h-5 w-10 rounded-full bg-amber-200 ml-1" />
        </CardAction>
        <Skeleton className="h-6 w-3/4 bg-amber-200" />
      </CardHeader>
    </Card>
  )
}
